#!/usr/bin/env python3
"""Deterministic preset packs for Clintware Plugin Forge."""
from __future__ import annotations
import argparse, ast, os, shutil, sys
from pathlib import Path

PRESETS_ROOT = Path(__file__).resolve().parent / "presets"

def default_plugin_roots() -> tuple[Path, ...]:
    home = Path.home()
    roots: list[Path] = []
    if sys.platform.startswith("win"):
        appdata = os.getenv("APPDATA")
        if appdata:
            roots.append(Path(appdata) / "GIMP" / "3.0" / "plug-ins")
    elif sys.platform == "darwin":
        roots.append(home / "Library" / "Application Support" / "GIMP" / "3.0" / "plug-ins")
    else:
        xdg = os.getenv("XDG_CONFIG_HOME")
        roots.append((Path(xdg) if xdg else home / ".config") / "GIMP" / "3.0" / "plug-ins")
    return tuple(roots)

def list_presets() -> tuple[str, ...]:
    if not PRESETS_ROOT.exists():
        return ()
    return tuple(sorted(
        p.name for p in PRESETS_ROOT.iterdir()
        if p.is_dir() and (p / f"{p.name}.py").is_file()
    ))

def preset_file(name: str) -> Path:
    if not name or name != Path(name).name or any(x in name for x in ("..", "/", "\\")):
        raise ValueError("Preset name must be a simple folder name")
    target = PRESETS_ROOT / name / f"{name}.py"
    if not target.is_file():
        raise FileNotFoundError(f"Unknown preset: {name}")
    return target

def validate_preset(name: str) -> None:
    target = preset_file(name)
    source = target.read_text(encoding="utf-8")
    ast.parse(source)
    required = {
        'gi.require_version("Gimp", "3.0")': "GIMP 3 GI declaration",
        "Gimp.PlugIn": "Gimp.PlugIn subclass",
        "do_query_procedures": "procedure query",
        "do_create_procedure": "procedure creation",
        "Gimp.ImageProcedure.new": "image procedure",
        '"<Image>/Clintware/': "Clintware menu namespace",
        "Gimp.main(": "GIMP entrypoint",
        "procedure.new_return_values(Gimp.PDBStatusType.SUCCESS, None)": "success return",
    }
    missing = [label for marker, label in required.items() if marker not in source]
    if f"plug-in-{name}" not in source:
        missing.append("procedure name matching preset folder")
    if missing:
        raise ValueError("Preset validation failed: missing " + ", ".join(missing))
    if "gimpfu" in source:
        raise ValueError("Preset validation failed: legacy gimpfu import")
    if "no generative model" not in source.lower():
        raise ValueError("Deterministic preset must document that it does not invoke a generative model")

def export_preset(name: str, output_root: Path) -> Path:
    validate_preset(name)
    src = preset_file(name).parent
    dst = Path(output_root).expanduser().resolve() / name
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    return dst / f"{name}.py"

def install_preset(name: str, plugin_root: Path | None = None) -> Path:
    roots = default_plugin_roots()
    if plugin_root is None:
        if not roots:
            raise RuntimeError("No default GIMP 3 plug-ins directory is available")
        plugin_root = roots[0]
    return export_preset(name, Path(plugin_root))

def cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="plugin-forge-presets")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list")
    val = sub.add_parser("validate"); val.add_argument("name")
    exp = sub.add_parser("export"); exp.add_argument("name"); exp.add_argument("--output", default="forge-output")
    ins = sub.add_parser("install"); ins.add_argument("name"); ins.add_argument("--root")
    args = parser.parse_args(argv)
    if args.command == "list":
        print("\n".join(list_presets())); return 0
    if args.command == "validate":
        validate_preset(args.name); print(f"OK: {args.name}"); return 0
    if args.command == "export":
        print(export_preset(args.name, Path(args.output))); return 0
    if args.command == "install":
        print(install_preset(args.name, Path(args.root) if args.root else None)); return 0
    return 2

if __name__ == "__main__":
    raise SystemExit(cli())
