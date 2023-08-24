import os


class FileUtils:
    def __init__(self):
        pass

    @staticmethod
    def get_file_path(filepath):
        return os.path.join(os.getcwd(), filepath)
