package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	phoneUploadMaxBody   = 120 << 20 // 120 MiB total per request
	phoneUploadPartMemory  = 32 << 20
	phoneUploadMaxFiles    = 40
)

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
// The returned stop function shuts down the server and removes the temp directory.
func StartLANImageUploadServer(onUploaded func(paths []string)) (pageURL string, stop func() error, err error) {
	if onUploaded == nil {
		return "", nil, fmt.Errorf("onUploaded callback is required")
	}

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
		Handler:         newPhoneUploadHandler(token, dir, onUploaded),
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

func newPhoneUploadHandler(token, dir string, onUploaded func(paths []string)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.Trim(r.URL.Path, "/")
		parts := strings.Split(path, "/")
		if len(parts) != 2 || parts[0] != "u" || parts[1] != token {
			http.NotFound(w, r)
			return
		}

		switch r.Method {
		case http.MethodGet:
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = w.Write([]byte(phoneUploadHTML))
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
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(phoneUploadErrHTML + "<p>No files.</p></body></html>"))
				return
			}
			if len(files) > phoneUploadMaxFiles {
				http.Error(w, "Too many files", http.StatusBadRequest)
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

			onUploaded(saved)

			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = w.Write([]byte(phoneUploadOKHTML))
		default:
			w.Header().Set("Allow", "GET, POST")
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
}

const phoneUploadHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Upload images</title>
<style>
body{font-family:system-ui,sans-serif;padding:1rem;max-width:28rem;margin:0 auto}
button{padding:.6rem 1rem;font-size:1rem}
input[type=file]{margin:1rem 0}
</style>
</head>
<body>
<h1>PDF Wizard</h1>
<p>Add photos from this phone. They will appear in PDF Wizard on your computer.</p>
<form method="post" enctype="multipart/form-data">
<label><strong>Photos</strong><br>
<input type="file" name="files" multiple accept="image/*,.heic,.heif">
</label>
<p><button type="submit">Upload</button></p>
</form>
</body>
</html>`

const phoneUploadOKHTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Done</title></head>
<body style="font-family:system-ui,sans-serif;padding:1rem;text-align:center">
<p><strong>Upload complete.</strong></p>
<p>You can close this page.</p>
</body></html>`

const phoneUploadErrHTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Error</title></head>
<body style="font-family:system-ui,sans-serif;padding:1rem">`
