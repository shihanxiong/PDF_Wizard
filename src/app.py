import os
import sys
import logging
from PyQt6.QtWidgets import QApplication, QMainWindow, QWidget
from PyQt6.QtGui import QIcon, QPixmap
from file_utils import FileUtils
from time_utils import TimeUtils
from sys_utils import SysUtils


class App(QWidget):
    def __init__(self):
        super().__init__()

        # app config
        self.setGeometry(400, 400, 700, 400)
        self.setWindowTitle("PDF Tool")
        icon_path = FileUtils.get_file_path(
            os.path.join("src", "assets", "img", "app_logo.png")
        )
        if SysUtils.is_running_in_pyinstaller_bundle():
            icon_path = FileUtils.get_bundled_file_path(os.path.join("app_logo.png"))

        self.setWindowIcon(QIcon(QPixmap(icon_path)))
        self.setFixedWidth(700)
        self.setFixedHeight(400)

        # self.setStyleSheet("background-color:green")
        # self.setWindowOpacity(0.5)

        # initialize logging
        log_formatter = logging.Formatter(
            fmt="%(asctime)s [%(threadName)-12.12s] [%(levelname)-5.5s]  %(message)s",
            datefmt="%m/%d/%Y %I:%M:%S %p",
        )
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.DEBUG)

        # file handler
        file_handler = logging.FileHandler(f"{TimeUtils.get_current_date()}.log")
        file_handler.setFormatter(log_formatter)
        root_logger.addHandler(file_handler)

        # console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(log_formatter)
        root_logger.addHandler(console_handler)


try:
    if __name__ == "__main__":
        app = QApplication(sys.argv)
        window = App()
        window.show()
        sys.exit(app.exec())
except Exception as err:
    logging.error(f"app.py: {str(err)}")
