# Loading the pyPdf Library
from PyPDF2 import PdfFileMerger
from PIL import Image
import os

input_dir = 'merger/input/'
output_dir = 'merger/output/'
files = os.listdir(input_dir)

print(files)

merger = PdfFileMerger()

# convert all `.jpeg` files to PDF
for file in files:
    if file.endswith('.jpeg'):
        image = Image.open(input_dir + file)
        im = image.convert('RGB')
        im.save(r'input/' + file.replace('.jpeg', '') + '.pdf')

files = os.listdir(input_dir)

# combine all PDF files
for file in files:
    if file.endswith(".pdf"):
        merger.append(open(input_dir + file, 'rb'))

with open(output_dir + 'output.pdf', 'wb') as fout:
    merger.write(fout)
