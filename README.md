# PDFMerger

<p align="center">
  <img src="./src/assets/img/app_logo_raw.png" width="450" height="450" />
</p>

### Installation

#### Install Dependencies

```bash
# pre-requisites
# python v3.9 (currently PyQt6/PyQt6-tools only support python 3.9)

$pip3 install -r requirements.txt
```

#### Windows

```bash
# TBD
```

#### Mac

```bash
# TBD
```

### Packaging:

```bash
# TBD
```

#### Apple M chips

```bash
# Install version below
pip uninstall pyinstaller
PYINSTALLER_COMPILE_BOOTLOADER=1 pip install git+https://github.com/pyinstaller/pyinstaller.git@develop
```

### PyQt Designer

```bash
# example location (win32)
E:\software\Python\Python310\Lib\site-packages\qt6_applications\Qt\bin
```

### Change logs

> change logs can be found [here](changelog.md)

## Trouble Shooting

### `wails` command not found

Ensure you have `go` installed correctly. On MacOS, go binary is installed to `/usr/local/go`, whereas `wails` is installed under `~go/bin/wails`. So you can run `sudo cp ~/go/bin/wails /usr/local/go/bin/` to resolve this.
