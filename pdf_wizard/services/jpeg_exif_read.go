// JPEG EXIF orientation scan is adapted from readOrientation in
// github.com/disintegration/imaging v1.6.2 (io.go), MIT License.
// Copyright (c) 2012 Grigory Dryapak — see imaging/LICENSE.

package services

import (
	"encoding/binary"
	"io"
)

// readJPEGExifOrientation reads the EXIF orientation tag from a JPEG stream.
// If the first two bytes are not the JPEG SOI marker, it returns (0, false).
// If the file is a JPEG but EXIF is missing or the orientation tag is absent,
// it returns (0, true) meaning “no rotation” (same as imaging.AutoOrientation).
// If a tag value 1–8 is read, it returns (value, true); values 2–8 require a transform.
func readJPEGExifOrientation(r io.Reader) (orient int, isJPEG bool) {
	const (
		markerSOI      = 0xffd8
		markerAPP1     = 0xffe1
		exifHeader     = 0x45786966
		byteOrderBE    = 0x4d4d
		byteOrderLE    = 0x4949
		orientationTag = 0x0112
	)

	var soi uint16
	if err := binary.Read(r, binary.BigEndian, &soi); err != nil {
		return 0, false
	}
	if soi != markerSOI {
		return 0, false
	}
	isJPEG = true

	for {
		var marker, size uint16
		if err := binary.Read(r, binary.BigEndian, &marker); err != nil {
			return 0, isJPEG
		}
		if err := binary.Read(r, binary.BigEndian, &size); err != nil {
			return 0, isJPEG
		}
		if marker>>8 != 0xff {
			return 0, isJPEG
		}
		if marker == markerAPP1 {
			break
		}
		if size < 2 {
			return 0, isJPEG
		}
		if _, err := io.CopyN(io.Discard, r, int64(size-2)); err != nil {
			return 0, isJPEG
		}
	}

	var header uint32
	if err := binary.Read(r, binary.BigEndian, &header); err != nil {
		return 0, isJPEG
	}
	if header != exifHeader {
		return 0, isJPEG
	}
	if _, err := io.CopyN(io.Discard, r, 2); err != nil {
		return 0, isJPEG
	}

	var (
		byteOrderTag uint16
		byteOrder    binary.ByteOrder
	)
	if err := binary.Read(r, binary.BigEndian, &byteOrderTag); err != nil {
		return 0, isJPEG
	}
	switch byteOrderTag {
	case byteOrderBE:
		byteOrder = binary.BigEndian
	case byteOrderLE:
		byteOrder = binary.LittleEndian
	default:
		return 0, isJPEG
	}
	if _, err := io.CopyN(io.Discard, r, 2); err != nil {
		return 0, isJPEG
	}

	var offset uint32
	if err := binary.Read(r, byteOrder, &offset); err != nil {
		return 0, isJPEG
	}
	if offset < 8 {
		return 0, isJPEG
	}
	if _, err := io.CopyN(io.Discard, r, int64(offset-8)); err != nil {
		return 0, isJPEG
	}

	var numTags uint16
	if err := binary.Read(r, byteOrder, &numTags); err != nil {
		return 0, isJPEG
	}

	for i := 0; i < int(numTags); i++ {
		var tag uint16
		if err := binary.Read(r, byteOrder, &tag); err != nil {
			return 0, isJPEG
		}
		if tag != orientationTag {
			if _, err := io.CopyN(io.Discard, r, 10); err != nil {
				return 0, isJPEG
			}
			continue
		}
		if _, err := io.CopyN(io.Discard, r, 6); err != nil {
			return 0, isJPEG
		}
		var val uint16
		if err := binary.Read(r, byteOrder, &val); err != nil {
			return 0, isJPEG
		}
		if val < 1 || val > 8 {
			return 0, isJPEG
		}
		return int(val), isJPEG
	}
	return 0, isJPEG
}
