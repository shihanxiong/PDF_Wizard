from PyPDF2 import PdfFileReader, PdfFileWriter
import os

input_dir = 'spliter/input/'
output_dir = 'spliter/output/'
input_file = input_dir + 'input.pdf'
output_file = output_dir + 'output.pdf'

reader = PdfFileReader(open(input_file, 'rb'))
writer = PdfFileWriter()

start = 52
end = 79

start -= 1
with open(output_file, "wb") as f:
    for i in range(start, end):
        writer.addPage(reader.getPage(i))
        writer.write(f)
        i += 1
    print("PDF splitting process complete")
