#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Clintware Eclipse Logo — deterministic GIMP 3 renderer.

No bitmap reference is imported and no generative model is called. The mark is
constructed inside GIMP from selections, incremental annular fills, and editable
text layers using normalized geometry.
"""

from __future__ import annotations

import math
import sys

import gi

gi.require_version("Gimp", "3.0")
gi.require_version("Gegl", "0.4")
from gi.repository import Gimp, Gegl, GLib, GObject

PROCEDURE_NAME = "plug-in-clintware-eclipse-logo"
MENU_LABEL = "Draw Eclipse Logo (Deterministic)"
MENU_PATH = "<Image>/Clintware/Brand"
AUTHOR = "Clintware"
YEAR = "2026"

DISC_RADIUS_RATIO = 0.355
GLOW_SPAN_RATIO = 0.132
CENTER_X_RATIO = 0.500
CENTER_Y_RATIO = 0.500
MAIN_TEXT_TARGET_WIDTH = 0.752
MAIN_TEXT_Y_RATIO = 0.442
MAIN_TEXT_LEFT_BIAS = 0.045
TM_SCALE = 0.32
TM_GAP_RATIO = 0.007
TM_RISE_RATIO = 0.030

BACKGROUND_RGB = (8, 15, 25)
DISC_CENTER_RGB = (1, 2, 4)
DISC_EDGE_RGB = (12, 20, 29)
CYAN_RGB = (54, 229, 255)
CYAN_HIGHLIGHT_RGB = (177, 249, 255)
WHITE_RGB = (248, 250, 252)


def _color(rgb: tuple[int, int, int], alpha: float = 1.0) -> Gegl.Color:
    c = Gegl.Color.new("black")
    c.set_rgba(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0, alpha)
    return c


def _mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return tuple(int(round(x + (y - x) * t)) for x, y in zip(a, b))


def _new_layer(image: Gimp.Image, parent: Gimp.Layer, name: str) -> Gimp.Layer:
    layer = Gimp.Layer.new(
        image, name, image.get_width(), image.get_height(),
        Gimp.ImageType.RGBA_IMAGE, 100.0, Gimp.LayerMode.NORMAL,
    )
    layer.fill(Gimp.FillType.TRANSPARENT)
    image.insert_layer(layer, parent, 0)
    return layer


def _fill_whole(layer: Gimp.Layer, rgb: tuple[int, int, int]) -> None:
    Gimp.context_set_foreground(_color(rgb))
    layer.fill(Gimp.FillType.FOREGROUND)


def _select_ring(image: Gimp.Image, cx: float, cy: float, outer_r: float, inner_r: float) -> None:
    image.select_ellipse(Gimp.ChannelOps.REPLACE, cx - outer_r, cy - outer_r, outer_r * 2.0, outer_r * 2.0)
    if inner_r > 0.0:
        image.select_ellipse(Gimp.ChannelOps.SUBTRACT, cx - inner_r, cy - inner_r, inner_r * 2.0, inner_r * 2.0)


def _paint_ring(image: Gimp.Image, layer: Gimp.Layer, cx: float, cy: float,
                outer_r: float, inner_r: float, rgb: tuple[int, int, int]) -> None:
    _select_ring(image, cx, cy, outer_r, inner_r)
    Gimp.context_set_foreground(_color(rgb))
    layer.edit_fill(Gimp.FillType.FOREGROUND)


def _paint_circle(image: Gimp.Image, layer: Gimp.Layer, cx: float, cy: float,
                  radius: float, rgb: tuple[int, int, int]) -> None:
    image.select_ellipse(Gimp.ChannelOps.REPLACE, cx - radius, cy - radius, radius * 2.0, radius * 2.0)
    Gimp.context_set_foreground(_color(rgb))
    layer.edit_fill(Gimp.FillType.FOREGROUND)


def _draw_outer_glow(image: Gimp.Image, parent: Gimp.Layer, cx: float, cy: float,
                     radius: float, glow_span: float, steps: int, strength: float) -> Gimp.Layer:
    layer = _new_layer(image, parent, "02 · Cyan Glow — incremental annuli")
    band = glow_span / float(steps)
    for i in range(steps - 1, -1, -1):
        inner = radius + i * band
        outer = radius + (i + 1) * band + 0.35
        d = (i + 0.5) / max(1.0, float(steps))
        influence = math.exp(-4.4 * (d ** 1.55)) * 0.78 * strength
        influence = min(0.93, influence)
        _paint_ring(image, layer, cx, cy, outer, inner, _mix(BACKGROUND_RGB, CYAN_RGB, influence))
    return layer


def _draw_disc(image: Gimp.Image, parent: Gimp.Layer, cx: float, cy: float,
               radius: float, steps: int) -> Gimp.Layer:
    layer = _new_layer(image, parent, "03 · Eclipse Face — incremental shading")
    bands = max(12, min(64, steps // 2))
    band = radius / float(bands)
    _paint_circle(image, layer, cx, cy, band + 0.5, DISC_CENTER_RGB)
    for i in range(1, bands):
        inner = i * band
        outer = (i + 1) * band + 0.35
        t = i / max(1.0, bands - 1)
        rgb = _mix(DISC_CENTER_RGB, DISC_EDGE_RGB, (t ** 3.2) * 0.72)
        _paint_ring(image, layer, cx, cy, outer, inner, rgb)
    _paint_ring(image, layer, cx, cy, radius,
                max(0.0, radius - max(1.0, radius * 0.010)),
                _mix(DISC_EDGE_RGB, (18, 28, 37), 0.45))
    return layer


def _draw_rim(image: Gimp.Image, parent: Gimp.Layer, cx: float, cy: float, radius: float) -> Gimp.Layer:
    layer = _new_layer(image, parent, "04 · Eclipse Rim")
    unit = max(0.75, min(image.get_width(), image.get_height()) / 256.0)
    _paint_ring(image, layer, cx, cy, radius + 1.15 * unit, radius + 0.10 * unit, CYAN_RGB)
    _paint_ring(image, layer, cx, cy, radius + 0.30 * unit, radius - 0.72 * unit, CYAN_HIGHLIGHT_RGB)
    _paint_ring(image, layer, cx, cy, radius - 0.30 * unit, radius - 1.35 * unit,
                _mix(CYAN_RGB, (38, 123, 165), 0.40))
    return layer


def _resolve_font(requested: Gimp.Font | None) -> Gimp.Font:
    if requested is not None:
        return requested
    for name in ("Arial", "Arial Bold", "Liberation Sans", "DejaVu Sans", "Sans"):
        font = Gimp.Font.get_by_name(name)
        if font is not None:
            return font
    return Gimp.context_get_font()


def _fit_text_layer(image: Gimp.Image, parent: Gimp.Layer, text: str, font: Gimp.Font,
                    target_width: float, initial_size: float) -> tuple[Gimp.TextLayer, float]:
    text_layer = Gimp.TextLayer.new(image, text, font, initial_size, Gimp.Unit.pixel())
    image.insert_layer(text_layer, parent, 0)
    text_layer.set_color(_color(WHITE_RGB))
    text_layer.set_antialias(True)
    size = float(initial_size)
    for _ in range(8):
        measured = max(1, text_layer.get_width())
        ratio = target_width / measured
        if 0.992 <= ratio <= 1.008:
            break
        size = max(4.0, min(size * ratio, image.get_height() * 0.5))
        text_layer.set_font_size(size, Gimp.Unit.pixel())
    return text_layer, size


def _draw_text(image: Gimp.Image, parent: Gimp.Layer, text: str, show_tm: bool,
               requested_font: Gimp.Font | None) -> None:
    width = image.get_width()
    height = image.get_height()
    font = _resolve_font(requested_font)
    main, main_size = _fit_text_layer(
        image, parent, text, font, width * MAIN_TEXT_TARGET_WIDTH, max(10.0, height * 0.195)
    )
    main.set_name("05 · Wordmark — editable text")
    main_x = int(round((width - main.get_width()) / 2.0 - width * MAIN_TEXT_LEFT_BIAS))
    main_y = int(round(height * MAIN_TEXT_Y_RATIO))
    main.set_offsets(main_x, main_y)

    if show_tm:
        tm = Gimp.TextLayer.new(image, "™", font, max(7.0, main_size * TM_SCALE), Gimp.Unit.pixel())
        image.insert_layer(tm, parent, 0)
        tm.set_name("06 · Trademark — editable text")
        tm.set_color(_color(WHITE_RGB))
        tm.set_antialias(True)
        tm.set_offsets(
            int(round(main_x + main.get_width() + width * TM_GAP_RATIO)),
            int(round(main_y - height * TM_RISE_RATIO)),
        )


def _render_logo(image: Gimp.Image, logo_text: str, requested_font: Gimp.Font | None,
                 ring_steps: int, glow_strength: float, show_tm: bool) -> None:
    width = image.get_width()
    height = image.get_height()
    short = float(min(width, height))
    cx = width * CENTER_X_RATIO
    cy = height * CENTER_Y_RATIO
    radius = short * DISC_RADIUS_RATIO
    glow_span = short * GLOW_SPAN_RATIO

    group = Gimp.GroupLayer.new(image, "Clintware Eclipse Logo — deterministic build")
    image.insert_layer(group, None, 0)
    background = _new_layer(image, group, "01 · Background")
    _fill_whole(background, BACKGROUND_RGB)
    _draw_outer_glow(image, group, cx, cy, radius, glow_span, ring_steps, glow_strength)
    _draw_disc(image, group, cx, cy, radius, ring_steps)
    _draw_rim(image, group, cx, cy, radius)
    _draw_text(image, group, logo_text, show_tm, requested_font)


def run(procedure, run_mode, image, drawables, config, data):
    if image is None:
        return procedure.new_return_values(
            Gimp.PDBStatusType.CALLING_ERROR,
            GLib.Error("Open or create an image before running the Clintware logo renderer."),
        )
    if image.get_width() < 128 or image.get_height() < 128:
        return procedure.new_return_values(
            Gimp.PDBStatusType.CALLING_ERROR,
            GLib.Error("Use a canvas of at least 128×128 pixels; 1600×1369 or larger is recommended."),
        )

    if run_mode == Gimp.RunMode.INTERACTIVE:
        gi.require_version("GimpUi", "3.0")
        from gi.repository import GimpUi
        GimpUi.init("clintware-eclipse-logo")
        dialog = GimpUi.ProcedureDialog.new(procedure, config, "Clintware Eclipse Logo")
        GimpUi.window_set_transient(dialog)
        dialog.fill(["logo-text", "font", "ring-steps", "glow-strength", "show-tm"])
        if not dialog.run():
            dialog.destroy()
            return procedure.new_return_values(Gimp.PDBStatusType.CANCEL, None)
        dialog.destroy()

    logo_text = config.get_property("logo-text").strip() or "Clintware"
    font = config.get_property("font")
    ring_steps = int(config.get_property("ring-steps"))
    glow_strength = float(config.get_property("glow-strength"))
    show_tm = bool(config.get_property("show-tm"))

    image.undo_group_start()
    Gimp.context_push()
    try:
        Gimp.context_set_defaults()
        Gimp.context_set_antialias(True)
        _render_logo(image, logo_text, font, ring_steps, glow_strength, show_tm)
        Gimp.Selection.none(image)
        Gimp.displays_flush()
    except Exception as exc:
        return procedure.new_return_values(
            Gimp.PDBStatusType.EXECUTION_ERROR,
            GLib.Error(f"Clintware logo renderer failed: {exc}"),
        )
    finally:
        Gimp.context_pop()
        image.undo_group_end()

    return procedure.new_return_values(Gimp.PDBStatusType.SUCCESS, None)


class ClintwareEclipseLogoPlugin(Gimp.PlugIn):
    def do_query_procedures(self):
        return [PROCEDURE_NAME]

    def do_create_procedure(self, name):
        if name != PROCEDURE_NAME:
            return None
        procedure = Gimp.ImageProcedure.new(self, name, Gimp.PDBProcType.PLUGIN, run, None)
        procedure.set_sensitivity_mask(
            Gimp.ProcedureSensitivityMask.DRAWABLE | Gimp.ProcedureSensitivityMask.NO_DRAWABLES
        )
        procedure.set_menu_label(MENU_LABEL)
        procedure.add_menu_path(MENU_PATH)
        procedure.set_documentation(
            "Draw the Clintware eclipse logo deterministically inside GIMP.",
            "Constructs the eclipse, glow, rim, wordmark, and trademark from normalized geometry and editable GIMP layers. No source bitmap or generative image model is used.",
            None,
        )
        procedure.set_attribution(AUTHOR, AUTHOR, YEAR)
        procedure.add_string_argument(
            "logo-text", "Wordmark", "Editable wordmark text.", "Clintware", GObject.ParamFlags.READWRITE
        )
        procedure.add_font_argument(
            "font", "Font",
            "Font for the wordmark. Leave unchanged to use the closest available sans-serif fallback.",
            False, None, True, GObject.ParamFlags.READWRITE,
        )
        procedure.add_int_argument(
            "ring-steps", "Incremental ring steps",
            "Number of hand-filled concentric annuli used to construct the glow. Higher values are smoother.",
            24, 256, 96, GObject.ParamFlags.READWRITE,
        )
        procedure.add_double_argument(
            "glow-strength", "Glow strength", "Brightness multiplier for the cyan outer glow.",
            0.35, 1.40, 1.00, GObject.ParamFlags.READWRITE,
        )
        procedure.add_boolean_argument(
            "show-tm", "Show ™", "Create the trademark symbol as a separate editable text layer.",
            True, GObject.ParamFlags.READWRITE,
        )
        return procedure


Gimp.main(ClintwareEclipseLogoPlugin.__gtype__, sys.argv)
