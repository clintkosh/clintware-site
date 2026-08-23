; Quillgeist Windows installer
#ifndef SourceDir
  #define SourceDir "..\..\dist"
#endif
#ifndef OutputDir
  #define OutputDir "..\..\dist"
#endif
#ifndef AppVersion
  #define AppVersion "0.3.0-alpha"
#endif

#define AppName "Quillgeist"
#define Publisher "Clintware"
#define AppExe "Quillgeist.exe"
#define CliExe "Quillgeist-CLI.exe"

[Setup]
AppId={{3C0CE8E9-ED4B-4BD9-A9A2-6A9F9F0EB1B2}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#Publisher}
DefaultDirName={localappdata}\Programs\Quillgeist
DefaultGroupName=Quillgeist
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=Quillgeist-Setup-Windows-x64
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#AppExe}
CloseApplications=yes
RestartApplications=no
SetupLogging=yes

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked
Name: "startup"; Description: "Start Quillgeist with Windows"; GroupDescription: "Startup:"; Flags: checkedonce

[Files]
Source: "{#SourceDir}\Quillgeist.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\Quillgeist-Windows-x64.exe"; DestDir: "{app}"; DestName: "{#CliExe}"; Flags: ignoreversion

[Icons]
Name: "{group}\Quillgeist"; Filename: "{app}\{#AppExe}"
Name: "{group}\Quillgeist Cloud"; Filename: "https://quillgeist.clintware.com"
Name: "{group}\Quillgeist CLI"; Filename: "{cmd}"; Parameters: "/K ""{app}\{#CliExe}"" --help"; WorkingDir: "{app}"
Name: "{autodesktop}\Quillgeist"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "Quillgeist"; ValueData: """{app}\{#AppExe}"" --minimized"; Flags: uninsdeletevalue; Tasks: startup

Root: HKCU; Subkey: "Software\Classes\.abpack"; ValueType: string; ValueName: ""; ValueData: "Quillgeist.ExecutionPack"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\Quillgeist.ExecutionPack"; ValueType: string; ValueName: ""; ValueData: "Quillgeist Execution Pack"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\Quillgeist.ExecutionPack\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#AppExe},0"
Root: HKCU; Subkey: "Software\Classes\Quillgeist.ExecutionPack\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#CliExe}"" open ""%1"""

Root: HKCU; Subkey: "Software\Classes\.abresult"; ValueType: string; ValueName: ""; ValueData: "Quillgeist.ResultPack"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\Quillgeist.ResultPack"; ValueType: string; ValueName: ""; ValueData: "Quillgeist Result Pack"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\Quillgeist.ResultPack\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#AppExe},0"
Root: HKCU; Subkey: "Software\Classes\Quillgeist.ResultPack\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#CliExe}"" open ""%1"""

[Run]
Filename: "{app}\{#AppExe}"; Description: "Launch Quillgeist"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{localappdata}\Programs\Quillgeist\__pycache__"
