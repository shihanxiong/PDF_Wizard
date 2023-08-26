import os
import sys
from PyQt6.QtWidgets import QApplication, QMainWindow, QWidget
from PyQt6.QtGui import QIcon, QPixmap
from file_utils import FileUtils


class Window(QWidget):
    def __init__(self):
        super().__init__()

        self.setGeometry(400, 400, 700, 400)
        self.setWindowTitle("PDF Tool")
        self.setWindowIcon(
            QIcon(
                QPixmap(
                    FileUtils.get_file_path(
                        os.path.join("src", "assets", "img", "app_logo.png")
                    )
                )
            )
        )
        self.setFixedWidth(700)
        self.setFixedHeight(400)

        # self.setStyleSheet("background-color:green")
        # self.setWindowOpacity(0.5)


app = QApplication(sys.argv)
window = Window()
window.show()
sys.exit(app.exec())
