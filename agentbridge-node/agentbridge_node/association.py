from __future__ import annotations
from pathlib import Path
import os
import platform
import shutil
import subprocess
import sys
from .config import home_dir

def _launcher() -> str:
    exe = Path(sys.argv[0]).resolve()
    if exe.name.lower().startswith(("quillgeist","agentbridge")) and exe.exists():
        return f'"{exe}"'
    return f'"{sys.executable}" -m agentbridge_node'

def install(include_md_json: bool = False) -> dict:
    system = platform.system().lower()
    if system == "windows": return _windows(include_md_json)
    if system == "linux": return _linux(include_md_json)
    if system == "darwin": return _mac(include_md_json)
    raise RuntimeError(f"unsupported platform: {system}")

def _windows(include_md_json: bool) -> dict:
    import winreg
    launcher = _launcher()
    classes = [
        (".abpack", "Quillgeist.ExecutionPack", "Quillgeist Execution Pack"),
        (".abresult", "Quillgeist.ResultPack", "Quillgeist Result Pack")
    ]
    if include_md_json:
        classes += [(".md","Quillgeist.Markdown","Markdown document"),(".json","Quillgeist.Json","JSON document")]
    for ext, progid, desc in classes:
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, fr"Software\Classes\{ext}") as k:
            winreg.SetValueEx(k, "", 0, winreg.REG_SZ, progid)
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, fr"Software\Classes\{progid}") as k:
            winreg.SetValueEx(k, "", 0, winreg.REG_SZ, desc)
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, fr"Software\Classes\{progid}\shell\open\command") as k:
            winreg.SetValueEx(k, "", 0, winreg.REG_SZ, f'{launcher} open "%1"')
    return {"product":"Quillgeist","platform":"windows","registered":[x[0] for x in classes]}

def _linux(include_md_json: bool) -> dict:
    app_dir = Path.home()/".local/share/applications"; mime_dir = Path.home()/".local/share/mime/packages"
    app_dir.mkdir(parents=True, exist_ok=True); mime_dir.mkdir(parents=True, exist_ok=True)
    launcher = _launcher().replace('"','\\"')
    desktop = "[Desktop Entry]\nType=Application\nName=Quillgeist\nExec=" + launcher + " open %f\nTerminal=true\nMimeType=application/x-quillgeist-pack;application/x-quillgeist-result;\nCategories=Development;Utility;\n"
    (app_dir/"quillgeist.desktop").write_text(desktop, encoding="utf-8")
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">\n  <mime-type type="application/x-quillgeist-pack"><comment>Quillgeist Execution Pack</comment><glob pattern="*.abpack"/></mime-type>\n  <mime-type type="application/x-quillgeist-result"><comment>Quillgeist Result Pack</comment><glob pattern="*.abresult"/></mime-type>\n</mime-info>\n'
    (mime_dir/"quillgeist.xml").write_text(xml, encoding="utf-8")
    for cmd in (["update-mime-database",str(mime_dir.parent)],["update-desktop-database",str(app_dir)]):
        if shutil.which(cmd[0]): subprocess.run(cmd, check=False)
    registered=[".abpack",".abresult"]
    if shutil.which("xdg-mime"):
        subprocess.run(["xdg-mime","default","quillgeist.desktop","application/x-quillgeist-pack"],check=False)
        subprocess.run(["xdg-mime","default","quillgeist.desktop","application/x-quillgeist-result"],check=False)
        if include_md_json:
            subprocess.run(["xdg-mime","default","quillgeist.desktop","text/markdown"],check=False)
            subprocess.run(["xdg-mime","default","quillgeist.desktop","application/json"],check=False)
            registered += [".md",".json"]
    return {"product":"Quillgeist","platform":"linux","registered":registered,"md_json_requested":include_md_json}

def _mac(include_md_json: bool) -> dict:
    import plistlib
    app = Path.home()/"Applications"/"Quillgeist.app"; macos=app/"Contents"/"MacOS"; macos.mkdir(parents=True, exist_ok=True)
    launcher=_launcher()
    script=macos/"Quillgeist"
    script.write_text("#!/bin/sh\nexec " + launcher + ' open "$1"\n', encoding="utf-8"); os.chmod(script,0o755)
    extensions=["abpack","abresult"]+(["md","json"] if include_md_json else [])
    plist={
      "CFBundleIdentifier":"com.clintware.quillgeist","CFBundleName":"Quillgeist","CFBundleExecutable":"Quillgeist",
      "CFBundlePackageType":"APPL","CFBundleVersion":"0.2.0","CFBundleShortVersionString":"0.2.0",
      "CFBundleDocumentTypes":[{"CFBundleTypeName":"Quillgeist documents","CFBundleTypeRole":"Editor","LSHandlerRank":"Owner","CFBundleTypeExtensions":extensions}]
    }
    with (app/"Contents"/"Info.plist").open("wb") as f: plistlib.dump(plist,f)
    lsregister=Path("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister")
    if lsregister.exists(): subprocess.run([str(lsregister),"-f",str(app)],check=False)
    return {"product":"Quillgeist","platform":"macos","registered":["."+x for x in extensions],"app":str(app)}
