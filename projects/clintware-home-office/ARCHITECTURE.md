# Clintware Home Office architecture

## Product shape

The suite is one shell with three document modules:

- **Writer**: current alpha and first real product surface.
- **Sheets**: next module.
- **Presentations**: follows Sheets.

The desktop client is local-first. Opening, editing, saving, recovery, and PDF generation must not require a hosted Clintware account.

## v1 stack

- **Python 3.11+** for fast product iteration.
- **PySide6 / Qt 6 Widgets** for the native desktop shell and editor.
- **python-docx** for Microsoft Word `.docx` package read/write at the current fidelity level.
- **Qt print engine** for PDF output.
- **PyInstaller** for Windows packaging.
- **Inno Setup** for a familiar Windows installer.
- **Single-file HTML/CSS/JS** for Portable Writer so the light web version can be hosted or saved locally and opened directly without a server.

## Boundaries

`app.py` owns the suite window, commands, menus, toolbar, tab management, save prompts, and status information.

`editor.py` owns one open Writer document and its visual canvas.

`formats.py` owns file-format adapters. Format parsing stays out of the editor so DOCX/ODT/RTF support can improve without rewriting the shell.

`theme.py` owns the native Clintware visual system.

`web/index.html` is deliberately independent of the Python runtime. It is the fallback/portable editor, not a remote-control wrapper around the desktop application.

## Why not C++ first

The user-facing bottleneck at this stage is interaction design and format behavior, not CPU throughput. Qt keeps the option open to move hot paths or future document-model components into C++ later. Starting the whole suite in C++ would slow validation of the actual product wedge.

## Path toward a full suite

The suite should converge on a shared local document package with:

1. document metadata and recovery;
2. style/theme definitions;
3. print/PDF services;
4. recent files and templates;
5. plug-in/automation hooks;
6. optional sync providers behind an explicit user-controlled interface;
7. format adapters per module.

Writer, Sheets, and Presentations then become editors over this shared layer rather than three unrelated apps.

## Format fidelity strategy

Office-format compatibility is a major engineering surface, not a checkbox. The alpha intentionally promises common document workflows, not pixel-identical Word round-tripping. Priorities are:

1. preserve text and paragraph structure reliably;
2. preserve common character formatting;
3. preserve alignment and lists;
4. add tables and images;
5. add styles, headers/footers, comments, sections, and tracked changes;
6. add ODT;
7. measure real-world DOCX fidelity against a regression corpus before making stronger compatibility claims.
