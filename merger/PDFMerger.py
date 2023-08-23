# Loading the pyPdf Library
from PyPDF2 import PdfFileMerger
from PIL import Image
import os

input_dir = 'merger/input/'
output_dir = 'merger/output/'

files = os.listdir(input_dir)
print("This order could be random:")
print(files)

merger = PdfFileMerger()

# convert all `.jpeg` files to PDF
for file in files:
    if file.endswith('.jpeg'):
        image = Image.open(input_dir + file)
        im = image.convert('RGB')
        im.save(r'input/' + file.replace('.jpeg', '') + '.pdf')
print('.jpeg files have been successfully comverted to .pdf files')

# comment below if you do not want to use a custom order
custom_files = ['1_51.pdf', '52_53.pdf', '54_81.pdf']
files = custom_files or os.listdir(input_dir)
print('Files used for merging: ', files)

# combine all PDF files
for file in files:
    if file.endswith(".pdf"):
        merger.append(open(input_dir + file, 'rb'))

with open(output_dir + 'output.pdf', 'wb') as fout:
    merger.write(fout)
print('PDF merging process complete')
