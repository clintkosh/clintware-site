# Clintware Plugin Forge — MVP v0.1.0

Local-first GIMP 3 Python plug-in scaffolding and legacy GIMP 2 Python-Fu migration assistance.

## MVP capabilities

- Generates GIMP 3 Python plug-in folders from simple natural-language intents.
- Deterministic mappings for clear/deselect, invert selection, and display refresh. Unknown requests produce a valid no-op scaffold with an explicit TODO instead of invented API calls.
- Scans `gimpfu`, `register()`, `main()`, `pdb.*`, and likely Python 2 print syntax.
- Migrates a small verified mapping set: `gimp_selection_none`, `gimp_selection_invert`, and `gimp_displays_flush`.
- Reports unmapped legacy calls for human review.
- Validates Python syntax, GIMP 3 registration structure, `<Image>/Clintware` menu placement, and folder/file naming before installation.
- Copies validated plug-ins into a selected GIMP 3 plug-ins root.
- Uses only the Python standard library in the core; `gui.py` provides the Tkinter desktop shell.

## Run

```bash
python plugin_forge.py generate --name "Selection Clear" --prompt "Clear the current selection"
python plugin_forge.py scan old-plugin.py
python plugin_forge.py migrate old-plugin.py
python gui.py
```

## Test

```bash
python -m unittest discover -s tests -v
python -m compileall -q plugin_forge.py gui.py tests
```

## Product direction

The smallest reliable architecture is **model behind validator**, not model directly writing into GIMP. A future bundled local SLM should emit a constrained operation plan or proposed patch. The deterministic migration/validation harness checks that output before any plug-in is installed.

This alpha is a migration assistant, not a claim of lossless arbitrary GIMP 2→3 transpilation. Unmapped API calls are deliberately surfaced rather than guessed.
