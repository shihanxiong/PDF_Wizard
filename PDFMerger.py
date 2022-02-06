# Loading the pyPdf Library
from PyPDF2 import PdfFileMerger
from PIL import Image
import os

files = os.listdir('input')

print(files)

merger = PdfFileMerger()

# convert all `.jpeg` files to PDF
for file in files:
    if file.endswith('.jpeg'):
        image = Image.open('input/' + file)
        im = image.convert('RGB')
        im.save(r'input/' + file.replace('.jpeg', '') + '.pdf')

files = os.listdir('input')

# combine all PDF files
for file in files:
    if file.endswith(".pdf"):
        merger.append(open('input/' + file, 'rb'))

with open('output/output.pdf', 'wb') as fout:
    merger.write(fout)
