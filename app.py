import kivy
from kivymd.app import MDApp
from kivy.uix.screenmanager import Screen
from kivymd.uix.button import MDRectangleFlatButton
from kivy.logger import Logger
from kivymd.uix.label import MDLabel
from plyer import filechooser
kivy.require('2.0.0')  # replace with your current kivy version !


class PDFMerger(MDApp):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.files_to_be_merged = []
        self.output_directory = ''
        self.label_output_directory = MDLabel(
            text=self.output_directory,
            pos_hint={"x": 0.5, "y": 0.1},
            halign="center",
        )

    def build(self):
        self.theme_cls.primary_palette = "Green"  # set theme

        screen = Screen()
        screen.add_widget(
            MDRectangleFlatButton(
                text="Select output directory",
                pos_hint={"x": 0.05, "y": 0.9},
                on_release=self.btn_add_output_directory
            )
        )
        screen.add_widget(
            MDRectangleFlatButton(
                text="Select files to merge",
                pos_hint={"x": 0.05, "y": 0.8},
                on_release=self.btn_add_files_to_merge
            )
        )
        screen.add_widget(self.label_output_directory)
        return screen

    def btn_add_files_to_merge(self, obj):
        Logger.info('btn_add_files_to_merge() clicked')
        path = filechooser.open_file()
        if len(path):
            self.files_to_be_merged.append(path[0])
            print(self.files_to_be_merged)

    def btn_add_output_directory(self, obj):
        Logger.info('btn_add_output_directory() clicked')
        path = filechooser.choose_dir()
        if len(path):
            self.output_directory = path[0]
            print(self.output_directory)
            self.label_output_directory.text = self.output_directory


if __name__ == '__main__':
    PDFMerger().run()
