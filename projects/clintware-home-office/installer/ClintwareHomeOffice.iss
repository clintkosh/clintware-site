#define MyAppName "Clintware Home Office"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Clintware"
#define MyAppExeName "ClintwareHomeOffice.exe"

[Setup]
AppId={{D31ED041-3A13-4E16-AFD7-C64A8C6BA0A1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Clintware\Home Office
DefaultGroupName=Clintware Home Office
OutputDir=..\dist-installer
OutputBaseFilename=ClintwareHomeOffice-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\{#MyAppExeName}

[Files]
Source: "..\dist\ClintwareHomeOffice\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Clintware Home Office"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Clintware Home Office"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Clintware Home Office"; Flags: nowait postinstall skipifsilent
