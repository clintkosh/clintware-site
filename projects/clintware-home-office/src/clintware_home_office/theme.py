APP_QSS = r'''
QMainWindow, QWidget {
    background: #080a0e;
    color: #f4f7fb;
    font-family: "Segoe UI", "Inter", sans-serif;
    font-size: 10.5pt;
}
QMenuBar {
    background: #0b0e13;
    color: #c9d2df;
    border-bottom: 1px solid #252d38;
    padding: 2px 6px;
}
QMenuBar::item { padding: 6px 9px; border-radius: 5px; }
QMenuBar::item:selected { background: #151b24; color: white; }
QMenu {
    background: #10151c;
    color: #e8edf5;
    border: 1px solid #303947;
    padding: 6px;
}
QMenu::item { padding: 7px 28px 7px 10px; border-radius: 5px; }
QMenu::item:selected { background: #1b2530; color: #bdf7ff; }
QToolBar {
    background: #0d1117;
    border: 0;
    border-bottom: 1px solid #252d38;
    spacing: 4px;
    padding: 6px 8px;
}
QToolButton {
    background: transparent;
    color: #d8e0eb;
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 5px 7px;
}
QToolButton:hover { background: #171e27; border-color: #2b3542; }
QToolButton:checked { background: #16313a; border-color: #68e4f6; color: #bdf7ff; }
QComboBox, QSpinBox, QLineEdit {
    background: #121820;
    color: #eef3f8;
    border: 1px solid #2a3440;
    border-radius: 7px;
    min-height: 28px;
    padding: 0 7px;
}
QComboBox:hover, QSpinBox:hover, QLineEdit:hover { border-color: #455568; }
QComboBox QAbstractItemView { background: #10151c; color: #eef3f8; selection-background-color: #20323b; }
QTabWidget::pane { border: 0; background: #080a0e; }
QTabBar::tab {
    background: #0d1117;
    color: #8996a8;
    padding: 10px 14px;
    border-right: 1px solid #252d38;
    border-bottom: 1px solid #252d38;
}
QTabBar::tab:selected { background: #111720; color: #f4f7fb; border-bottom-color: #68e4f6; }
QTabBar::tab:hover { color: #dce5ef; }
QStatusBar { background: #0b0e13; color: #8390a2; border-top: 1px solid #252d38; }
QStatusBar::item { border: 0; }
QScrollBar:vertical { background: #0c1016; width: 12px; margin: 0; }
QScrollBar::handle:vertical { background: #35404d; border-radius: 6px; min-height: 35px; margin: 2px; }
QScrollBar::handle:vertical:hover { background: #4b5a6c; }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
QMessageBox, QFileDialog { background: #0d1117; }
'''
