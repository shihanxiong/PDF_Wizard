# Loading the pyPdf Library
from PyPDF2 import PdfMerger
from PIL import Image
import os

input_dir = "src/merger/input/"
output_dir = "src/merger/output/"

files = os.listdir(input_dir)
print("This order could be random:")
print(files)

merger = PdfMerger()

# convert all `.jpeg` files to PDF
for file in files:
    if file.endswith(".jpeg"):
        image = Image.open(input_dir + file)
        im = image.convert("RGB")
        im.save(r"input/" + file.replace(".jpeg", "") + ".pdf")
print(".jpeg files have been successfully comverted to .pdf files")

# comment below if you do not want to use a custom order
custom_files = ["1.pdf", "2.pdf", "3.pdf", "4.pdf"]
files = custom_files or os.listdir(input_dir)
print("Files used for merging: ", files)

# combine all PDF files
for file in files:
    if file.endswith(".pdf"):
        merger.append(open(input_dir + file, "rb"))

with open(output_dir + "output.pdf", "wb") as fout:
    merger.write(fout)
print("PDF merging process complete")
