//go:build darwin && cgo

package main

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa

#import <Cocoa/Cocoa.h>

// Sets the Dock / Cmd-Tab icon for dev builds (bare binary without .app Resources).
void pdfWizardSetDockIcon(void* ptr, int len) {
	@autoreleasepool {
		if (ptr == NULL || len <= 0) {
			return;
		}
		NSData *data = [NSData dataWithBytes:ptr length:(NSUInteger)len];
		if (data == nil || [data length] == 0) {
			return;
		}
		NSImage *img = [[NSImage alloc] initWithData:data];
		if (img == nil) {
			return;
		}
		[NSApplication sharedApplication];
		[NSApp setApplicationIconImage:img];
	}
}
*/
import "C"

import "unsafe"

func applyEmbeddedDockIcon(png []byte) {
	if len(png) == 0 {
		return
	}
	C.pdfWizardSetDockIcon(unsafe.Pointer(&png[0]), C.int(len(png)))
}
