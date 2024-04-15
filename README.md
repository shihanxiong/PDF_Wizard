# PDFMerger

<p align="center">
  <img src="./assets/img/app_logo_raw.png" width="450" height="450" />
</p>

## Installation

### Install Dependencies

Install go + wails per documentation: https://wails.io/docs/gettingstarted/installation

## Local Environment

### Windows & MacOS

```bash
$cd pdf_wizard
$wails dev
```

## Packaging:

```bash
# build executables based on current os
$wails build
```

## Change logs

> change logs can be found [here](changelog.md)

## Trouble Shooting

### `wails` command not found on MacOS

Ensure you have `go` installed correctly. On MacOS, go binary is installed to `/usr/local/go`, whereas `wails` is installed under `~go/bin/wails`. So you can run `sudo cp ~/go/bin/wails /usr/local/go/bin/` to resolve this.
