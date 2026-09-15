from __future__ import annotations

import sys
from pathlib import Path

from PySide6.QtCore import QSettings, Qt
from PySide6.QtGui import QAction, QColor, QFont, QTextCharFormat, QTextCursor, QTextListFormat
from PySide6.QtPrintSupport import QPrinter
from PySide6.QtWidgets import (
    QApplication, QColorDialog, QFileDialog, QFontComboBox, QMainWindow,
    QMessageBox, QSpinBox, QStatusBar, QTabWidget, QToolBar
)

from .editor import DocumentEditor
from .formats import docx_available, load_docx, load_text_like, save_docx, save_text_like
from .theme import APP_QSS

APP_NAME = "Clintware Home Office"
ORG_NAME = "Clintware"


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.settings = QSettings(ORG_NAME, APP_NAME)
        self.setWindowTitle(f"{APP_NAME} — Writer")
        self.resize(1280, 820)
        self.setMinimumSize(900, 620)

        self.tabs = QTabWidget()
        self.tabs.setTabsClosable(True)
        self.tabs.setMovable(True)
        self.tabs.tabCloseRequested.connect(self.close_tab)
        self.tabs.currentChanged.connect(self.sync_ui)
        self.setCentralWidget(self.tabs)

        self.status = QStatusBar()
        self.setStatusBar(self.status)
        self.status.showMessage("Local-first document editor")

        self._build_actions()
        self._build_menus()
        self._build_toolbar()
        self.new_document()

    def _action(self, text, shortcut=None, slot=None, checkable=False):
        action = QAction(text, self)
        if shortcut:
            action.setShortcut(shortcut)
        if slot:
            action.triggered.connect(slot)
        action.setCheckable(checkable)
        return action

    def _build_actions(self):
        self.a_new = self._action("New", "Ctrl+N", self.new_document)
        self.a_open = self._action("Open…", "Ctrl+O", self.open_document)
        self.a_save = self._action("Save", "Ctrl+S", self.save_document)
        self.a_save_as = self._action("Save As…", "Ctrl+Shift+S", self.save_document_as)
        self.a_pdf = self._action("Export PDF…", "Ctrl+Alt+P", self.export_pdf)
        self.a_close = self._action("Close Document", "Ctrl+W", lambda: self.close_tab(self.tabs.currentIndex()))
        self.a_exit = self._action("Exit", "Alt+F4", self.close)

        self.a_undo = self._action("Undo", "Ctrl+Z", lambda: self.current_editor().undo())
        self.a_redo = self._action("Redo", "Ctrl+Y", lambda: self.current_editor().redo())
        self.a_cut = self._action("Cut", "Ctrl+X", lambda: self.current_editor().cut())
        self.a_copy = self._action("Copy", "Ctrl+C", lambda: self.current_editor().copy())
        self.a_paste = self._action("Paste", "Ctrl+V", lambda: self.current_editor().paste())
        self.a_select_all = self._action("Select All", "Ctrl+A", lambda: self.current_editor().selectAll())

        self.a_bold = self._action("Bold", "Ctrl+B", lambda: self.toggle_char("bold"), True)
        self.a_italic = self._action("Italic", "Ctrl+I", lambda: self.toggle_char("italic"), True)
        self.a_underline = self._action("Underline", "Ctrl+U", lambda: self.toggle_char("underline"), True)
        self.a_color = self._action("Text Color…", None, self.choose_text_color)
        self.a_left = self._action("Align Left", "Ctrl+L", lambda: self.set_alignment(Qt.AlignmentFlag.AlignLeft), True)
        self.a_center = self._action("Center", "Ctrl+E", lambda: self.set_alignment(Qt.AlignmentFlag.AlignCenter), True)
        self.a_right = self._action("Align Right", "Ctrl+R", lambda: self.set_alignment(Qt.AlignmentFlag.AlignRight), True)
        self.a_justify = self._action("Justify", "Ctrl+J", lambda: self.set_alignment(Qt.AlignmentFlag.AlignJustify), True)
        self.a_bullets = self._action("Bulleted List", None, lambda: self.make_list(QTextListFormat.Style.ListDisc))
        self.a_numbers = self._action("Numbered List", None, lambda: self.make_list(QTextListFormat.Style.ListDecimal))
        self.a_clear = self._action("Clear Formatting", "Ctrl+\\", self.clear_formatting)

    def _build_menus(self):
        file_menu = self.menuBar().addMenu("File")
        for action in (self.a_new, self.a_open, self.a_save, self.a_save_as, self.a_pdf):
            file_menu.addAction(action)
        file_menu.addSeparator()
        file_menu.addAction(self.a_close)
        file_menu.addAction(self.a_exit)

        edit_menu = self.menuBar().addMenu("Edit")
        for action in (self.a_undo, self.a_redo):
            edit_menu.addAction(action)
        edit_menu.addSeparator()
        for action in (self.a_cut, self.a_copy, self.a_paste, self.a_select_all):
            edit_menu.addAction(action)

        format_menu = self.menuBar().addMenu("Format")
        for action in (self.a_bold, self.a_italic, self.a_underline, self.a_color):
            format_menu.addAction(action)
        format_menu.addSeparator()
        for action in (self.a_left, self.a_center, self.a_right, self.a_justify):
            format_menu.addAction(action)
        format_menu.addSeparator()
        format_menu.addAction(self.a_bullets)
        format_menu.addAction(self.a_numbers)
        format_menu.addSeparator()
        format_menu.addAction(self.a_clear)

        suite_menu = self.menuBar().addMenu("Suite")
        writer = QAction("Writer — available now", self)
        writer.setEnabled(False)
        suite_menu.addAction(writer)
        sheets = QAction("Sheets — in development", self)
        sheets.setEnabled(False)
        suite_menu.addAction(sheets)
        slides = QAction("Presentations — in development", self)
        slides.setEnabled(False)
        suite_menu.addAction(slides)

        help_menu = self.menuBar().addMenu("Help")
        about = QAction("About Clintware Home Office", self)
        about.triggered.connect(self.about)
        help_menu.addAction(about)

    def _build_toolbar(self):
        toolbar = QToolBar("Writer")
        toolbar.setMovable(False)
        self.addToolBar(toolbar)
        for action in (self.a_new, self.a_open, self.a_save):
            toolbar.addAction(action)
        toolbar.addSeparator()

        self.font_box = QFontComboBox()
        self.font_box.setMaximumWidth(175)
        self.font_box.currentFontChanged.connect(self.set_font_family)
        toolbar.addWidget(self.font_box)

        self.size_box = QSpinBox()
        self.size_box.setRange(7, 72)
        self.size_box.setValue(11)
        self.size_box.setSuffix(" pt")
        self.size_box.valueChanged.connect(self.set_font_size)
        toolbar.addWidget(self.size_box)

        toolbar.addSeparator()
        for action in (self.a_bold, self.a_italic, self.a_underline, self.a_color):
            toolbar.addAction(action)
        toolbar.addSeparator()
        for action in (self.a_left, self.a_center, self.a_right, self.a_justify):
            toolbar.addAction(action)
        toolbar.addSeparator()
        toolbar.addAction(self.a_bullets)
        toolbar.addAction(self.a_numbers)
        toolbar.addSeparator()
        toolbar.addAction(self.a_pdf)

    def current_doc(self) -> DocumentEditor:
        widget = self.tabs.currentWidget()
        if not isinstance(widget, DocumentEditor):
            raise RuntimeError("No active document")
        return widget

    def current_editor(self):
        return self.current_doc().editor

    def new_document(self):
        doc = DocumentEditor()
        index = self.tabs.addTab(doc, "Untitled")
        self.tabs.setCurrentIndex(index)
        doc.state_changed.connect(lambda d=doc: self.on_doc_state_changed(d))
        self.sync_ui()

    def open_document(self):
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Open document",
            "",
            "Documents (*.docx *.html *.htm *.txt *.md);;Word (*.docx);;HTML (*.html *.htm);;Text (*.txt *.md);;All files (*.*)",
        )
        if not path:
            return
        try:
            doc = DocumentEditor(path)
            if Path(path).suffix.lower() == ".docx":
                if not docx_available():
                    raise RuntimeError("DOCX support requires python-docx. Install project requirements or use the packaged Windows build.")
                doc.set_html(load_docx(path))
            else:
                text, is_html = load_text_like(path)
                doc.set_html(text) if is_html else doc.set_plain_text(text)
            index = self.tabs.addTab(doc, doc.display_name())
            self.tabs.setCurrentIndex(index)
            doc.state_changed.connect(lambda d=doc: self.on_doc_state_changed(d))
            self.add_recent(path)
            self.sync_ui()
        except Exception as exc:
            QMessageBox.critical(self, "Open failed", str(exc))

    def save_document(self):
        doc = self.current_doc()
        if not doc.path:
            return self.save_document_as()
        return self._save_to(doc.path)

    def save_document_as(self):
        doc = self.current_doc()
        path, selected = QFileDialog.getSaveFileName(
            self,
            "Save document",
            doc.path or "Untitled.docx",
            "Word Document (*.docx);;HTML Document (*.html);;Plain Text (*.txt);;Markdown (*.md)",
        )
        if not path:
            return False
        if not Path(path).suffix:
            if "Word" in selected:
                path += ".docx"
            elif "HTML" in selected:
                path += ".html"
            elif "Markdown" in selected:
                path += ".md"
            else:
                path += ".txt"
        return self._save_to(path)

    def _save_to(self, path: str):
        doc = self.current_doc()
        try:
            suffix = Path(path).suffix.lower()
            if suffix == ".docx":
                if not docx_available():
                    raise RuntimeError("DOCX support requires python-docx. Install project requirements or use the packaged Windows build.")
                save_docx(doc.editor, path)
            else:
                save_text_like(doc.editor, path)
            doc.path = path
            doc.mark_saved()
            self.tabs.setTabText(self.tabs.currentIndex(), doc.display_name())
            self.add_recent(path)
            self.status.showMessage(f"Saved {Path(path).name}", 4000)
            return True
        except Exception as exc:
            QMessageBox.critical(self, "Save failed", str(exc))
            return False

    def export_pdf(self):
        doc = self.current_doc()
        suggested = str(Path(doc.path).with_suffix(".pdf")) if doc.path else "Untitled.pdf"
        path, _ = QFileDialog.getSaveFileName(self, "Export PDF", suggested, "PDF (*.pdf)")
        if not path:
            return
        if not path.lower().endswith(".pdf"):
            path += ".pdf"
        printer = QPrinter(QPrinter.PrinterMode.HighResolution)
        printer.setOutputFormat(QPrinter.OutputFormat.PdfFormat)
        printer.setOutputFileName(path)
        doc.editor.document().print_(printer)
        self.status.showMessage(f"Exported {Path(path).name}", 4000)

    def maybe_save(self, doc: DocumentEditor) -> bool:
        if not doc.modified:
            return True
        answer = QMessageBox.question(
            self,
            APP_NAME,
            f"Save changes to {doc.display_name().replace(' •', '')}?",
            QMessageBox.StandardButton.Save | QMessageBox.StandardButton.Discard | QMessageBox.StandardButton.Cancel,
        )
        if answer == QMessageBox.StandardButton.Cancel:
            return False
        if answer == QMessageBox.StandardButton.Save:
            self.tabs.setCurrentWidget(doc)
            return bool(self.save_document())
        return True

    def close_tab(self, index: int):
        if index < 0:
            return
        doc = self.tabs.widget(index)
        if isinstance(doc, DocumentEditor) and not self.maybe_save(doc):
            return
        self.tabs.removeTab(index)
        if self.tabs.count() == 0:
            self.new_document()

    def closeEvent(self, event):
        for index in range(self.tabs.count() - 1, -1, -1):
            doc = self.tabs.widget(index)
            if isinstance(doc, DocumentEditor) and not self.maybe_save(doc):
                event.ignore()
                return
        event.accept()

    def merge_char_format(self, fmt: QTextCharFormat):
        cursor = self.current_editor().textCursor()
        if not cursor.hasSelection():
            cursor.select(QTextCursor.SelectionType.WordUnderCursor)
        cursor.mergeCharFormat(fmt)
        self.current_editor().mergeCurrentCharFormat(fmt)

    def toggle_char(self, kind: str):
        fmt = QTextCharFormat()
        current = self.current_editor().currentCharFormat()
        if kind == "bold":
            fmt.setFontWeight(QFont.Weight.Normal if current.fontWeight() >= QFont.Weight.Bold else QFont.Weight.Bold)
        elif kind == "italic":
            fmt.setFontItalic(not current.fontItalic())
        elif kind == "underline":
            fmt.setFontUnderline(not current.fontUnderline())
        self.merge_char_format(fmt)

    def set_font_family(self, font: QFont):
        fmt = QTextCharFormat()
        fmt.setFontFamily(font.family())
        self.merge_char_format(fmt)

    def set_font_size(self, size: int):
        fmt = QTextCharFormat()
        fmt.setFontPointSize(float(size))
        self.merge_char_format(fmt)

    def choose_text_color(self):
        color = QColorDialog.getColor(QColor("#111111"), self, "Text color")
        if color.isValid():
            fmt = QTextCharFormat()
            fmt.setForeground(color)
            self.merge_char_format(fmt)

    def set_alignment(self, alignment):
        self.current_editor().setAlignment(alignment)
        self.sync_ui()

    def make_list(self, style):
        cursor = self.current_editor().textCursor()
        cursor.beginEditBlock()
        list_format = QTextListFormat()
        list_format.setStyle(style)
        cursor.createList(list_format)
        cursor.endEditBlock()

    def clear_formatting(self):
        cursor = self.current_editor().textCursor()
        if not cursor.hasSelection():
            cursor.select(QTextCursor.SelectionType.WordUnderCursor)
        fmt = QTextCharFormat()
        fmt.setFont(QFont("Aptos", 11))
        fmt.setForeground(QColor("#15191f"))
        cursor.setCharFormat(fmt)

    def on_doc_state_changed(self, doc):
        index = self.tabs.indexOf(doc)
        if index >= 0:
            self.tabs.setTabText(index, doc.display_name())
        if doc is self.tabs.currentWidget():
            self.sync_ui()

    def sync_ui(self):
        if self.tabs.count() == 0:
            return
        editor = self.current_editor()
        char_format = editor.currentCharFormat()
        alignment = editor.alignment()
        self.a_bold.setChecked(char_format.fontWeight() >= QFont.Weight.Bold)
        self.a_italic.setChecked(char_format.fontItalic())
        self.a_underline.setChecked(char_format.fontUnderline())
        self.a_left.setChecked(bool(alignment & Qt.AlignmentFlag.AlignLeft))
        self.a_center.setChecked(bool(alignment & Qt.AlignmentFlag.AlignCenter))
        self.a_right.setChecked(bool(alignment & Qt.AlignmentFlag.AlignRight))
        self.a_justify.setChecked(bool(alignment & Qt.AlignmentFlag.AlignJustify))
        self.font_box.blockSignals(True)
        self.font_box.setCurrentFont(char_format.font())
        self.font_box.blockSignals(False)
        if char_format.fontPointSize() > 0:
            self.size_box.blockSignals(True)
            self.size_box.setValue(round(char_format.fontPointSize()))
            self.size_box.blockSignals(False)
        text = editor.toPlainText()
        words = len(text.split())
        chars = len(text)
        self.status.showMessage(f"Writer  ·  {words:,} words  ·  {chars:,} characters  ·  local file")

    def add_recent(self, path):
        recent = self.settings.value("recent", []) or []
        if isinstance(recent, str):
            recent = [recent]
        recent = [path] + [item for item in recent if item != path]
        self.settings.setValue("recent", recent[:10])

    def about(self):
        QMessageBox.about(
            self,
            APP_NAME,
            "<b>Clintware Home Office</b><br>Writer alpha 0.1<br><br>"
            "A local-first office suite from Clintware™.<br>"
            "Writer is working now. Sheets and Presentations are the next modules.<br><br>"
            "CLINTWARE™ — GO FURTHEST.™",
        )


def main():
    app = QApplication(sys.argv)
    app.setOrganizationName(ORG_NAME)
    app.setApplicationName(APP_NAME)
    app.setStyleSheet(APP_QSS)
    win = MainWindow()
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
