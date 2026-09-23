# Clintware Plugin Forge — MVP v0.1.0 + deterministic presets

Local-first GIMP 3 Python plug-in scaffolding, legacy GIMP 2 Python-Fu migration assistance, and reviewed deterministic plug-in presets.

## MVP capabilities

- Generates GIMP 3 Python plug-in folders from simple natural-language intents.
- Deterministic mappings for clear/deselect, invert selection, and display refresh. Unknown requests produce a valid no-op scaffold with an explicit TODO instead of invented API calls.
- Scans `gimpfu`, `register()`, `main()`, `pdb.*`, and likely Python 2 print syntax.
- Migrates a small verified mapping set: `gimp_selection_none`, `gimp_selection_invert`, and `gimp_displays_flush`.
- Reports unmapped legacy calls for human review.
- Validates Python syntax, GIMP 3 registration structure, `<Image>/Clintware` menu placement, and folder/file naming before installation.
- Copies validated plug-ins into a selected GIMP 3 plug-ins root.
- Uses only the Python standard library in the core; `gui.py` provides the Tkinter desktop shell.
- Supports reviewed deterministic preset packs for complex reusable plug-ins whose operations should not be invented at runtime.

## Run

```bash
python plugin_forge.py generate --name "Selection Clear" --prompt "Clear the current selection"
python plugin_forge.py scan old-plugin.py
python plugin_forge.py migrate old-plugin.py
python gui.py
```

## Deterministic preset packs

Preset packs live under `presets/<name>/<name>.py` and are validated separately from free-form scaffolding. This gives Plugin Forge a safe path for higher-complexity operations that have already been reviewed and should execute reproducibly.

```bash
python preset_manager.py list
python preset_manager.py validate clintware-eclipse-logo
python preset_manager.py export clintware-eclipse-logo --output forge-output
python preset_manager.py install clintware-eclipse-logo
```

The first preset, `clintware-eclipse-logo`, constructs the Clintware eclipse logo entirely with GIMP-native selection, fill, and editable-text operations. The cyan glow is built from configurable concentric annuli rather than a generated bitmap or runtime image model. Its geometry and palette are captured in `logo-spec.json` for reproducibility.

## Test

```bash
python -m unittest discover -s tests -v
python -m compileall -q plugin_forge.py preset_manager.py gui.py tests presets
```

## Product direction

The smallest reliable architecture is **model behind validator**, not model directly writing into GIMP. A future bundled local SLM should emit a constrained operation plan or proposed patch. The deterministic migration/validation harness checks that output before any plug-in is installed.

Reviewed presets extend that architecture: when a workflow needs precise, repeatable geometry or brand construction, Plugin Forge can ship an auditable implementation instead of asking a model to regenerate code or pixels each time.

This alpha is a migration and deterministic plug-in construction assistant, not a claim of lossless arbitrary GIMP 2→3 transpilation. Unmapped API calls are deliberately surfaced rather than guessed.
