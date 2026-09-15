# Clintware Home Office

**Clintware Home Office** is a local-first office-suite project from **Clintware™**. The first working module is **Writer**, a modern document editor intended to cover the everyday document job without forcing a Microsoft 365 subscription or a dated interface.

Current status: **Writer alpha / MVP**. Sheets and Presentations are product modules in development, not shipped functionality.

## What works in Writer now

- Multi-document tabbed desktop editing.
- Rich text formatting: font, size, bold, italic, underline, text color, paragraph alignment, bullet lists, numbered lists, undo/redo, clipboard actions.
- Open `.docx`, `.html`, `.htm`, `.txt`, and `.md`.
- Save true `.docx`, `.html`, `.txt`, and `.md`.
- Export directly to PDF using Qt's print engine.
- Local files only. No sign-in, subscription, telemetry requirement, or cloud dependency in the editor path.
- Dark Clintware application chrome around a clean white document canvas.
- Portable single-file browser editor in `web/index.html` with local recovery, HTML/text/Word-readable `.doc` export, and browser PDF printing.

## Why Python + Qt for v1

PySide6 gives the product the Qt 6 desktop widget stack while keeping iteration fast. The office engine is intentionally modular so performance-sensitive or format-sensitive pieces can later move to C++ without rebuilding the product shell from zero.

## Run from source

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -e .
clintware-home-office
```

## Build the Windows app

```powershell
.\build_windows.ps1
```

This creates `dist\ClintwareHomeOffice\ClintwareHomeOffice.exe`. Compile `installer\ClintwareHomeOffice.iss` with Inno Setup 6 for the end-user installer.

## Portable web editor

Open `web\index.html` directly in a modern browser. No server or install is required. The browser version is deliberately lighter than Writer: it edits locally and can export HTML, TXT, Word-readable `.doc`, and print/save to PDF. True `.docx` round-trip remains a desktop capability in the alpha.

## Product roadmap

### Writer
Next: page sizing/margins, headers/footers, inline images, tables, find/replace, spelling integration, styles, stronger DOCX round-trip fidelity, comments, track changes, and ODT.

### Sheets
Next module: grid engine, formulas, CSV/XLSX import/export, formatting, charts, filter/sort, and workbook tabs.

### Presentations
Next module: slide canvas, master layouts, text/media blocks, themes, speaker notes, and PPTX export.

### Shared suite layer
A common local document model, recent-file system, templates, print/export layer, plug-in surface, and optional user-controlled sync will be shared rather than implemented three times.

## Positioning boundary

This alpha is not represented as a full Microsoft Office replacement today. It is the working first module of a broader suite. The immediate test is whether a cleaner local editor with common Word/PDF workflows is useful enough for real everyday documents.

**CLINTWARE™ — GO FURTHEST.™**
