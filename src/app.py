from PyQt6.QtWidgets import QApplication, QMainWindow, QWidget
import sys

app = QApplication(sys.argv)

window = QMainWindow()
window.statusBar().showMessage("Welcome to PyQt6 Course")
window.menuBar().addMenu("File")
window.menuBar().setNativeMenuBar(False)

window.show()

sys.exit(app.exec())
