from PyPDF2 import PdfReader, PdfWriter
import os

input_dir = 'splitter/input/'
output_dir = 'splitter/output/'
input_file = input_dir + '2023_TaxReturn.pdf'
output_file = output_dir + 'output.pdf'

reader = PdfReader(open(input_file, 'rb'))
writer = PdfWriter()

start = 41
end = 44

start -= 1
with open(output_file, "wb") as f:
    for i in range(start, end):
        writer.add_page(reader.pages[i])
        writer.write(f)
        i += 1
    print("PDF splitting process complete")
