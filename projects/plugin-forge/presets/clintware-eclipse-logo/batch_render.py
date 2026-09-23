#!/usr/bin/env python3
"""Run inside GIMP's python-fu-eval batch interpreter.

Creates a fresh Clintware eclipse logo from deterministic geometry, saves an
editable XCF plus PNG export, then presents the image in the GIMP UI.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import gi
gi.require_version("Gimp", "3.0")
gi.require_version("Gio", "2.0")
from gi.repository import Gimp, Gio

HERE = Path(__file__).resolve().parent
PLUGIN_FILE = HERE / "clintware-eclipse-logo.py"
OUTPUT_DIR = Path.home() / "Pictures" / "Clintware"
XCF_PATH = OUTPUT_DIR / "clintware-eclipse-deterministic.xcf"
PNG_PATH = OUTPUT_DIR / "clintware-eclipse-deterministic.png"

spec = importlib.util.spec_from_file_location("clintware_eclipse_logo", PLUGIN_FILE)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load renderer: {PLUGIN_FILE}")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
image = Gimp.Image.new(1600, 1369, Gimp.ImageBaseType.RGB)

Gimp.context_push()
try:
    Gimp.context_set_defaults()
    Gimp.context_set_antialias(True)
    renderer._render_logo(
        image=image,
        logo_text="Clintware",
        requested_font=None,
        ring_steps=128,
        glow_strength=1.0,
        show_tm=True,
    )
    Gimp.Selection.none(image)
    if not Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, image, Gio.File.new_for_path(str(XCF_PATH)), None):
        raise RuntimeError(f"Failed to save XCF: {XCF_PATH}")
    if not Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, image, Gio.File.new_for_path(str(PNG_PATH)), None):
        raise RuntimeError(f"Failed to export PNG: {PNG_PATH}")
    display = Gimp.Display.new(image)
    if display is None:
        raise RuntimeError("GIMP could not create a display for the rendered image")
    display.present()
    Gimp.displays_flush()
finally:
    Gimp.context_pop()

print(f"CLINTWARE_RENDER_OK XCF={XCF_PATH} PNG={PNG_PATH}", flush=True)
