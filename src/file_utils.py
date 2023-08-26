import os
import sys
import logging


class FileUtils:
    def __init__(self):
        pass

    @staticmethod
    def get_file_path(file_path):
        return os.path.join(os.getcwd(), file_path)

    @staticmethod
    def get_bundled_file_path(file_path):
        try:
            # get the path to the temporary directory containing the bundled files
            base_path = getattr(
                sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__))
            )

            return os.path.join(base_path, file_path)
        except Exception as err:
            logging.error(f"{FileUtils.__name__}: {str(err)}")
