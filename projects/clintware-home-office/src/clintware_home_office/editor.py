from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Signal
from PySide6.QtGui import QFont
from PySide6.QtWidgets import QFrame, QHBoxLayout, QTextEdit, QVBoxLayout, QWidget


class DocumentEditor(QWidget):
    state_changed = Signal()

    def __init__(self, path: str | None = None, parent=None):
        super().__init__(parent)
        self.path = path
        self._modified = False

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        workspace = QFrame()
        workspace.setStyleSheet("QFrame{background:#0a0d12;border:0;}")
        workspace_layout = QHBoxLayout(workspace)
        workspace_layout.setContentsMargins(28, 26, 28, 34)

        self.editor = QTextEdit()
        self.editor.setAcceptRichText(True)
        self.editor.setUndoRedoEnabled(True)
        self.editor.setPlaceholderText("Start writing…")
        self.editor.setStyleSheet(
            "QTextEdit{background:#ffffff;color:#15191f;border:1px solid #313a46;"
            "border-radius:3px;padding:44px 54px;selection-background-color:#9beefa;"
            "selection-color:#101419;}"
        )
        self.editor.setMinimumWidth(620)
        self.editor.document().setDocumentMargin(8)
        self.editor.setFont(QFont("Aptos", 11))
        workspace_layout.addStretch(1)
        workspace_layout.addWidget(self.editor, 6)
        workspace_layout.addStretch(1)
        outer.addWidget(workspace)

        self.editor.textChanged.connect(self._on_text_changed)
        self.editor.cursorPositionChanged.connect(self.state_changed.emit)

    def _on_text_changed(self):
        self._modified = True
        self.state_changed.emit()

    @property
    def modified(self) -> bool:
        return self._modified

    def mark_saved(self):
        self._modified = False
        self.state_changed.emit()

    def display_name(self) -> str:
        name = Path(self.path).name if self.path else "Untitled"
        return f"{name}{' •' if self.modified else ''}"

    def set_html(self, html: str):
        self.editor.blockSignals(True)
        self.editor.setHtml(html)
        self.editor.blockSignals(False)
        self._modified = False

    def set_plain_text(self, text: str):
        self.editor.blockSignals(True)
        self.editor.setPlainText(text)
        self.editor.blockSignals(False)
        self._modified = False
