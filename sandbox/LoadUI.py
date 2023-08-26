from PyQt6.QtWidgets import QApplication, QWidget
import sys
from PyQt6 import uic


class UI(QWidget):
    def __init__(self):
        super().__init__()

        uic.load_ui("WindowUI.ui", self)


app = QApplication(sys.argv)
window = UI()
window.show()
app.exec()
