; Inno Setup script — DISCOVERIES DESKTOP STUDIO
; Build: dotnet publish src/Discoveries.Desktop -c Release -r win-x64 --self-contained true -o publish
;        then ISCC installer\DiscoveriesStudio.iss

#define AppName "DISCOVERIES DESKTOP STUDIO"
#define AppVersion "0.1.0"
#define AppExe "Discoveries.Desktop.exe"

[Setup]
AppId={{6B4C1E2A-3D7F-4E8B-9A51-D15C0FE3A0F3}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=DISCOVERIES
DefaultDirName={autopf}\DISCOVERIES Desktop Studio
DefaultGroupName=DISCOVERIES
UninstallDisplayIcon={app}\{#AppExe}
OutputDir=Output
OutputBaseFilename=DiscoveriesDesktopStudio-Setup-{#AppVersion}
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
WizardStyle=modern
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\publish\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

; User data (database, projects, media, logs) lives in %LOCALAPPDATA%\DiscoveriesStudio and is
; intentionally NOT removed on uninstall.
