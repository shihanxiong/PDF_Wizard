package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create menu with AppMenu (includes "About PDF Wizard" automatically)
	appMenu := menu.NewMenu()
	appMenu.Append(menu.AppMenu())

	// Add Settings menu item
	settingsSubMenu := menu.NewMenu()
	settingsSubMenu.Append(menu.Text("Settings", nil, func(_ *menu.CallbackData) {
		// Emit event to frontend to show settings dialog
		app.EmitSettingsEvent()
	}))
	appMenu.Append(menu.SubMenu("Settings", settingsSubMenu))

	appMenu.Append(menu.EditMenu())
	appMenu.Append(menu.WindowMenu())

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "PDF Wizard",
		Width:     1024,
		Height:    900,
		MinWidth:  800,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop:     true,
			DisableWebViewDrop: true, // Disable WebView's native drag-and-drop to prevent interference
			// This setting works on both macOS and Windows:
			// - On Windows: Prevents WebView2 from intercepting drag-and-drop events
			// - On macOS: Prevents WebKit from interfering with Wails' native handler
		},
		Menu: appMenu,
		Mac: &mac.Options{
			About: &mac.AboutInfo{
				Title:   "PDF Wizard",
				Message: "A modern PDF toolkit built with Wails v2\n\nAutho: Hanxiong Shi\nVersion 1.0.0\nCopyright © 2025",
			},
		},
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
