# PDFMerger

<p align="center">
  <img src="./assets/img/app_logo_raw.png" width="450" height="450" />
</p>

### Installation

#### Install Dependencies

```bash
# pre-requisites
# python v3.9 (currently PyQt6/PyQt6-tools only support python 3.9)

$pip3 install -r requirements.txt
```

### Local Environment

#### Windows & MacOS

```bash
$cd pdf_wizard
$wails dev
```

### Packaging:

```bash
# build executables based on current os
$wails build
```

### Change logs

> change logs can be found [here](changelog.md)

## Trouble Shooting

### `wails` command not found

Ensure you have `go` installed correctly. On MacOS, go binary is installed to `/usr/local/go`, whereas `wails` is installed under `~go/bin/wails`. So you can run `sudo cp ~/go/bin/wails /usr/local/go/bin/` to resolve this.
