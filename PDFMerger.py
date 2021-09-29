# Loading the pyPdf Library
from PyPDF2 import PdfFileMerger
import os

files = os.listdir('input')

print files

merger = PdfFileMerger()

for file in files:
    if file.endswith(".pdf"):
        merger.append(open('input/' + file, 'rb'))

with open('test_1_materials.pdf', 'wb') as fout:
    merger.write(fout)
