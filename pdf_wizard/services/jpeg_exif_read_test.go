package services

import (
	"os"
	"testing"
)

func TestReadJPEGExifOrientation_fixtures(t *testing.T) {
	for _, tc := range []struct {
		file string
		want int
	}{
		{"testdata/jpeg_exif_orientation_1.jpg", 1},
		{"testdata/jpeg_exif_orientation_6.jpg", 6},
	} {
		f, err := os.Open(tc.file)
		if err != nil {
			t.Fatal(err)
		}
		o, jpg := readJPEGExifOrientation(f)
		_ = f.Close()
		if !jpg {
			t.Fatalf("%s: expected JPEG", tc.file)
		}
		if o != tc.want {
			t.Fatalf("%s: got orient %d want %d", tc.file, o, tc.want)
		}
	}
}
