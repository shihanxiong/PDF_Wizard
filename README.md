# PDFMerger

```
This app is working in progress, currently supports:
- merging multiple files into a single PDF file
- splitting a PDF file into given start / end pages
```

### Installation:

#### Windows

```bash
# pre-requisites:
# make sure to have VcXsrv running w/ -ac arguments (/mnt/e/software/VcXsrv/xlaunch.exe)
# display number: 0 | do not allow access control | uncheck "native openGL"
$(kivy_venv) shihanxiong@DESKTOP-5DHS48L:/mnt/e/dev/github/PDFMerger$export DISPLAY=172.20.144.1:0

# Ensure you have kivy installed
$python3 -m pip install --upgrade pip setuptools virtualenv
$pip3 install kivy[full] # windows
$pip3 install 'kivy[full]' # MacOS

# create virtual env for kivy
$python3 -m virtualenv kivy_venv

# before each start, run
$source kivy_venv/bin/activate

# run application
$python3 app.py
```

#### Mac

```bash
TBD
```

### Packaging:

#### Windows

```bash
# pre-requisites:
# make sure you have pyinstaller installed and use a windows Shell (GitBASH)
# if pip not found
$python -m ensurepip

$pip install --upgrade pyinstaller

# compile the application
$python -m PyInstaller --name PDFMerger app.py
$python -m PyInstaller PDFMerger.spec --noconfirm


# using auto-py-to-exe
$pip install auto-py-to-exe
$auto-py-to-exe # start GUI (make sure to run in windows powershell)
```

### Change logs

> change logs can be found [here](changelog.md)
