package services

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"html/template"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"pdf_wizard/models"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	phoneUploadMaxBody = 120 << 20 // 120 MiB total per request
	phoneUploadPartMemory = 32 << 20
	// PhoneUploadMaxFilesPerSession is the maximum number of images per phone upload POST / session.
	PhoneUploadMaxFilesPerSession = 25
)

var (
	tmplPhoneForm = template.Must(template.New("phoneForm").Parse(`<!DOCTYPE html>
<html lang="{{.Lang}}" dir="{{.Dir}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{.Title}}</title>
<style>
:root{--primary:#1976d2;--primary-hover:#1565c0;--on-primary:#fff;--radius:4px}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:1rem;max-width:28rem;margin:0 auto;background:#fafafa;color:rgba(0,0,0,.87)}
.page-header{display:flex;align-items:center;gap:12px;margin:0 0 1rem}
.page-logo{flex-shrink:0;width:40px;height:40px;object-fit:contain;display:block}
.page-title{font-size:1.5rem;font-weight:600;margin:0;line-height:1.2}
.intro{margin:0 0 1rem;line-height:1.5;color:rgba(0,0,0,.6)}
.field-label{display:block;font-weight:600;margin-bottom:.5rem;font-size:.875rem}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.selected-count{margin:.5rem 0 0;font-size:.875rem;line-height:1.4;color:rgba(0,0,0,.6)}
.actions{display:flex;flex-direction:column;gap:12px;margin-top:.75rem}
.btn{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:36px;padding:6px 16px;font-size:.875rem;font-weight:500;line-height:1.75;letter-spacing:.02857em;text-transform:none;text-decoration:none;border-radius:var(--radius);border:none;cursor:pointer;width:100%;transition:background .15s,box-shadow .15s;box-shadow:0 3px 1px -2px rgba(0,0,0,.2),0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12)}
.btn-primary{background:var(--primary);color:var(--on-primary)}
.btn-primary:hover{background:var(--primary-hover)}
.btn-primary:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
label.btn{margin:0}
</style>
</head>
<body>
<header class="page-header">
<img class="page-logo" src="logo.png" alt="" width="40" height="40" decoding="async">
<h1 class="page-title">{{.Heading}}</h1>
</header>
<p class="intro">{{.Intro}}</p>
<form method="post" enctype="multipart/form-data">
<label class="field-label" for="phone-files">{{.PhotosLabel}}</label>
<div class="actions">
<input type="file" id="phone-files" class="sr-only" name="files" multiple accept="image/*,.heic,.heif" required>
<label for="phone-files" class="btn btn-primary">{{.ChooseFiles}}</label>
<p id="selected-count" class="selected-count" hidden></p>
<button type="submit" class="btn btn-primary">{{.Upload}}</button>
</div>
</form>
<script>
(function(){
  var maxFiles = {{.MaxFiles}};
  var line = {{.SelectedLineJS}};
  var tooMany = {{.TooManyLineJS}};
  var el = document.getElementById('selected-count');
  var input = document.getElementById('phone-files');
  function update(){
    if (!input.files || input.files.length < 1) { el.hidden = true; el.textContent = ''; return; }
    if (input.files.length > maxFiles) {
      alert(tooMany);
      input.value = '';
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.textContent = line.replace(/__COUNT__/g, String(input.files.length));
    el.hidden = false;
  }
  input.addEventListener('change', update);
})();
</script>
</body>
</html>`))

	tmplPhoneOK = template.Must(template.New("phoneOK").Parse(`<!DOCTYPE html>
<html lang="{{.Lang}}" dir="{{.Dir}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{.DoneTitle}}</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:1rem;max-width:28rem;margin:0 auto;background:#fafafa;color:rgba(0,0,0,.87)}
.page-header{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 1rem;flex-wrap:wrap}
.page-logo{width:40px;height:40px;object-fit:contain;display:block}
.done-title{font-size:1.25rem;font-weight:600;margin:0}
.done-body{margin:.75rem 0 0;line-height:1.5;color:rgba(0,0,0,.6)}
</style>
</head>
<body>
<header class="page-header">
<img class="page-logo" src="logo.png" alt="" width="40" height="40" decoding="async">
<p class="done-title">{{.DoneTitle}}</p>
</header>
<p class="done-body">{{.DoneBody}}</p>
</body>
</html>`))

	tmplPhoneErrNoFiles = template.Must(template.New("phoneErr").Parse(`<!DOCTYPE html>
<html lang="{{.Lang}}" dir="{{.Dir}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{.Title}}</title>
<style>
:root{--primary:#1976d2}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:1rem;max-width:28rem;margin:0 auto;background:#fafafa;color:rgba(0,0,0,.87)}
.page-header{display:flex;align-items:center;gap:12px;margin:0 0 1rem}
.page-logo{width:40px;height:40px;object-fit:contain;display:block}
.page-title{font-size:1.25rem;font-weight:600;margin:0;line-height:1.2}
.err-msg{margin:0 0 1rem;line-height:1.5;color:rgba(0,0,0,.87)}
.retry-link{color:var(--primary);font-weight:500;text-decoration:none}
.retry-link:hover{text-decoration:underline}
</style>
</head>
<body>
<header class="page-header">
<img class="page-logo" src="logo.png" alt="" width="40" height="40" decoding="async">
<span class="page-title">{{.Heading}}</span>
</header>
<p class="err-msg">{{.NoFiles}}</p>
<p><a class="retry-link" href="./">{{.Retry}}</a></p>
</body>
</html>`))

	tmplPhoneErrTooMany = template.Must(template.New("phoneTooMany").Parse(`<!DOCTYPE html>
<html lang="{{.Lang}}" dir="{{.Dir}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{.Title}}</title>
<style>
:root{--primary:#1976d2}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:1rem;max-width:28rem;margin:0 auto;background:#fafafa;color:rgba(0,0,0,.87)}
.page-header{display:flex;align-items:center;gap:12px;margin:0 0 1rem}
.page-logo{width:40px;height:40px;object-fit:contain;display:block}
.page-title{font-size:1.25rem;font-weight:600;margin:0;line-height:1.2}
.err-msg{margin:0 0 1rem;line-height:1.5;color:rgba(0,0,0,.87)}
.retry-link{color:var(--primary);font-weight:500;text-decoration:none}
.retry-link:hover{text-decoration:underline}
</style>
</head>
<body>
<header class="page-header">
<img class="page-logo" src="logo.png" alt="" width="40" height="40" decoding="async">
<span class="page-title">{{.Heading}}</span>
</header>
<p class="err-msg">{{.TooManyFiles}}</p>
<p><a class="retry-link" href="./">{{.Retry}}</a></p>
</body>
</html>`))
)

func normalizePhoneCopy(c models.PhoneUploadPageCopy) models.PhoneUploadPageCopy {
	def := models.PhoneUploadPageCopy{
		Lang:        "en",
		Dir:         "ltr",
		Title:       "PDF Wizard — Upload",
		Heading:     "PDF Wizard",
		Intro:       "Add photos from this phone. They will appear in PDF Wizard on your computer.",
		PhotosLabel: "Photos",
		ChooseFiles: "Select images",
		Upload:      "Upload",
		DoneTitle:   "Upload complete.",
		DoneBody:    "You can close this page.",
		NoFiles:     "No images were selected. Go back and choose at least one file.",
		Retry:       "Try again",
		SelectedCountLine: "__COUNT__ images selected for upload",
		TooManyFiles:      fmt.Sprintf("You can upload at most %d images per session.", PhoneUploadMaxFilesPerSession),
	}
	merge := func(a, b string) string {
		if strings.TrimSpace(a) != "" {
			return a
		}
		return b
	}
	out := models.PhoneUploadPageCopy{
		Lang:        merge(c.Lang, def.Lang),
		Title:       merge(c.Title, def.Title),
		Heading:     merge(c.Heading, def.Heading),
		Intro:       merge(c.Intro, def.Intro),
		PhotosLabel: merge(c.PhotosLabel, def.PhotosLabel),
		ChooseFiles: merge(c.ChooseFiles, def.ChooseFiles),
		Upload:      merge(c.Upload, def.Upload),
		DoneTitle:   merge(c.DoneTitle, def.DoneTitle),
		DoneBody:    merge(c.DoneBody, def.DoneBody),
		NoFiles:     merge(c.NoFiles, def.NoFiles),
		Retry:       merge(c.Retry, def.Retry),
		SelectedCountLine: merge(c.SelectedCountLine, def.SelectedCountLine),
		TooManyFiles:      merge(c.TooManyFiles, def.TooManyFiles),
	}
	switch {
	case c.Dir == "rtl" || c.Dir == "ltr":
		out.Dir = c.Dir
	case strings.TrimSpace(c.Lang) == "ar":
		out.Dir = "rtl"
	default:
		out.Dir = def.Dir
	}
	return out
}

func writePhoneHTML(t *template.Template, page *models.PhoneUploadPageCopy) ([]byte, error) {
	var buf bytes.Buffer
	if err := t.Execute(&buf, page); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func writePhoneFormHTML(page *models.PhoneUploadPageCopy) ([]byte, error) {
	data := struct {
		models.PhoneUploadPageCopy
		SelectedLineJS template.JS
		TooManyLineJS  template.JS
		MaxFiles       int
	}{
		PhoneUploadPageCopy: *page,
		SelectedLineJS:      template.JS(strconv.Quote(page.SelectedCountLine)),
		TooManyLineJS:       template.JS(strconv.Quote(page.TooManyFiles)),
		MaxFiles:            PhoneUploadMaxFilesPerSession,
	}
	var buf bytes.Buffer
	if err := tmplPhoneForm.Execute(&buf, &data); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// PrimaryLANIPv4 returns a private IPv4 address suitable for LAN URLs, or any
// non-loopback IPv4 if none of the RFC1918 addresses are found.
func PrimaryLANIPv4() (string, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return "", err
	}
	var fallback string
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue
		}
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil {
				continue
			}
			ip = ip.To4()
			if ip == nil || ip.IsLoopback() {
				continue
			}
			s := ip.String()
			if isPrivateIPv4(ip) {
				return s, nil
			}
			if fallback == "" {
				fallback = s
			}
		}
	}
	if fallback != "" {
		return fallback, nil
	}
	return "", fmt.Errorf("no usable IPv4 address found")
}

func isPrivateIPv4(ip net.IP) bool {
	if len(ip) != 4 {
		return false
	}
	b := ip[0]
	switch {
	case b == 10:
		return true
	case b == 172 && ip[1] >= 16 && ip[1] <= 31:
		return true
	case b == 192 && ip[1] == 168:
		return true
	default:
		return false
	}
}

// StartLANImageUploadServer listens on a random TCP port on all interfaces, serves
// a minimal upload page at /u/{token}/, and saves posted images to a temp directory.
// onUploaded is called with absolute paths after a successful POST (may be empty if no valid images).
// pageCopy is translated text from the app UI (same language as PDF Wizard).
// The returned stop function shuts down the server and removes the temp directory.
func StartLANImageUploadServer(onUploaded func(paths []string), pageCopy models.PhoneUploadPageCopy) (pageURL string, stop func() error, err error) {
	if onUploaded == nil {
		return "", nil, fmt.Errorf("onUploaded callback is required")
	}

	page := normalizePhoneCopy(pageCopy)

	tokenBytes := make([]byte, 16)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", nil, err
	}
	token := hex.EncodeToString(tokenBytes)

	dir, err := os.MkdirTemp("", "pdfwizard-phone-*")
	if err != nil {
		return "", nil, err
	}

	ln, err := net.Listen("tcp", "0.0.0.0:0")
	if err != nil {
		_ = os.RemoveAll(dir)
		return "", nil, err
	}
	addr := ln.Addr().(*net.TCPAddr)

	host, err := PrimaryLANIPv4()
	if err != nil {
		ln.Close()
		_ = os.RemoveAll(dir)
		return "", nil, err
	}

	srv := &http.Server{
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       5 * time.Minute,
		WriteTimeout:      2 * time.Minute,
		Handler:           newPhoneUploadHandler(token, dir, onUploaded, &page),
	}

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = srv.Serve(ln)
	}()

	pageURL = fmt.Sprintf("http://%s:%d/u/%s/", host, addr.Port, token)

	stopFn := func() error {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
		wg.Wait()
		return os.RemoveAll(dir)
	}

	return pageURL, stopFn, nil
}

// cloneUploadedImagesForApp copies files from the phone session directory into
// separate os.TempDir files so they survive StopImagesPhoneUpload (RemoveAll on
// the session dir). Returns new absolute paths; removes originals on success.
func cloneUploadedImagesForApp(sessionPaths []string) ([]string, error) {
	if len(sessionPaths) == 0 {
		return nil, nil
	}
	var out []string
	cleanupOut := func() {
		for _, p := range out {
			_ = os.Remove(p)
		}
		out = nil
	}
	for _, p := range sessionPaths {
		ext := filepath.Ext(p)
		if ext == "" {
			ext = ".jpg"
		}
		dst, err := os.CreateTemp("", "pdfwizard-img-*"+ext)
		if err != nil {
			cleanupOut()
			return nil, fmt.Errorf("create temp: %w", err)
		}
		dstPath := dst.Name()

		src, err := os.Open(p)
		if err != nil {
			_ = dst.Close()
			_ = os.Remove(dstPath)
			cleanupOut()
			return nil, fmt.Errorf("open session file: %w", err)
		}
		_, err = io.Copy(dst, src)
		_ = src.Close()
		closeErr := dst.Close()
		if err != nil {
			_ = os.Remove(dstPath)
			cleanupOut()
			return nil, fmt.Errorf("copy: %w", err)
		}
		if closeErr != nil {
			_ = os.Remove(dstPath)
			cleanupOut()
			return nil, closeErr
		}
		if err := validateImageFile(dstPath); err != nil {
			_ = os.Remove(dstPath)
			cleanupOut()
			return nil, err
		}
		_ = os.Remove(p)
		out = append(out, dstPath)
	}
	return out, nil
}

func phoneUploadSuccessRedirect(w http.ResponseWriter, r *http.Request, token string) {
	u := &url.URL{
		Scheme: "http",
		Host:   r.Host,
		Path:   fmt.Sprintf("/u/%s/ok", token),
	}
	if r.TLS != nil {
		u.Scheme = "https"
	}
	http.Redirect(w, r, u.String(), http.StatusSeeOther)
}

func newPhoneUploadHandler(token, dir string, onUploaded func(paths []string), page *models.PhoneUploadPageCopy) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.Trim(r.URL.Path, "/")
		parts := strings.Split(path, "/")
		if len(parts) < 2 || parts[0] != "u" || parts[1] != token {
			http.NotFound(w, r)
			return
		}

		// GET /u/{token}/ok — success page only (PRG: refresh does not resubmit POST).
		if len(parts) == 3 && parts[2] == "ok" {
			if r.Method != http.MethodGet {
				w.Header().Set("Allow", http.MethodGet)
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Content-Language", page.Lang)
			b, err := writePhoneHTML(tmplPhoneOK, page)
			if err != nil {
				http.Error(w, "Server error", http.StatusInternalServerError)
				return
			}
			_, _ = w.Write(b)
			return
		}

		// GET /u/{token}/logo.png — embedded app logo (relative logo.png in HTML; avoids data: URI escaping issues on phones).
		if len(parts) == 3 && parts[2] == "logo.png" {
			if r.Method != http.MethodGet {
				w.Header().Set("Allow", http.MethodGet)
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				return
			}
			if len(phonePageLogoPNG) == 0 {
				http.Error(w, "Not found", http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "image/png")
			w.Header().Set("Cache-Control", "public, max-age=3600")
			_, _ = w.Write(phonePageLogoPNG)
			return
		}

		if len(parts) != 2 {
			http.NotFound(w, r)
			return
		}

		switch r.Method {
		case http.MethodGet:
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Content-Language", page.Lang)
			b, err := writePhoneFormHTML(page)
			if err != nil {
				http.Error(w, "Server error", http.StatusInternalServerError)
				return
			}
			_, _ = w.Write(b)
		case http.MethodPost:
			r.Body = http.MaxBytesReader(w, r.Body, phoneUploadMaxBody)
			if err := r.ParseMultipartForm(phoneUploadPartMemory); err != nil {
				http.Error(w, "Bad request", http.StatusBadRequest)
				return
			}
			defer func() {
				_ = r.MultipartForm.RemoveAll()
			}()

			files := r.MultipartForm.File["files"]
			if len(files) == 0 {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.Header().Set("Content-Language", page.Lang)
				w.WriteHeader(http.StatusBadRequest)
				b, err := writePhoneHTML(tmplPhoneErrNoFiles, page)
				if err != nil {
					http.Error(w, "Server error", http.StatusInternalServerError)
					return
				}
				_, _ = w.Write(b)
				return
			}
			if len(files) > PhoneUploadMaxFilesPerSession {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.Header().Set("Content-Language", page.Lang)
				w.WriteHeader(http.StatusBadRequest)
				b, err := writePhoneHTML(tmplPhoneErrTooMany, page)
				if err != nil {
					http.Error(w, "Server error", http.StatusInternalServerError)
					return
				}
				_, _ = w.Write(b)
				return
			}

			var saved []string
			for _, fh := range files {
				ext := strings.ToLower(filepath.Ext(fh.Filename))
				if ext == "" {
					ext = ".jpg"
				}
				testName := "x" + ext
				if !IsImageFile(testName) {
					continue
				}
				src, err := fh.Open()
				if err != nil {
					continue
				}
				nameRand := make([]byte, 8)
				if _, err := rand.Read(nameRand); err != nil {
					src.Close()
					continue
				}
				outPath := filepath.Join(dir, fmt.Sprintf("%s%s", hex.EncodeToString(nameRand), ext))
				dst, err := os.Create(outPath)
				if err != nil {
					src.Close()
					continue
				}
				_, copyErr := io.Copy(dst, src)
				_ = dst.Close()
				src.Close()
				if copyErr != nil {
					_ = os.Remove(outPath)
					continue
				}
				if err := validateImageFile(outPath); err != nil {
					_ = os.Remove(outPath)
					continue
				}
				saved = append(saved, outPath)
			}

			durable, err := cloneUploadedImagesForApp(saved)
			if err != nil {
				http.Error(w, "Server error", http.StatusInternalServerError)
				return
			}
			onUploaded(durable)

			phoneUploadSuccessRedirect(w, r, token)
		default:
			w.Header().Set("Allow", "GET, POST")
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
}
