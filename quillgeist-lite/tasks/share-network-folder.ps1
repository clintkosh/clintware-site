param()

$ErrorActionPreference = "Stop"

$Path = "F:\AI"
$ShareName = "AI"
$FirewallRuleName = "Clintware AI SMB LAN"

function Log([string]$Message) {
  Write-Host ("SMB SHARE // " + $Message)
}

# Resolve the well-known Everyone SID to the localized account name.
$everyoneSid = New-Object System.Security.Principal.SecurityIdentifier("S-1-1-0")
$everyone = $everyoneSid.Translate([System.Security.Principal.NTAccount]).Value

if (-not (Test-Path -LiteralPath $Path)) {
  New-Item -ItemType Directory -Path $Path -Force | Out-Null
  Log "Created $Path"
}

$item = Get-Item -LiteralPath $Path
if (-not $item.PSIsContainer) {
  throw "$Path exists but is not a directory."
}

# Ensure the Windows SMB server is available.
Set-Service -Name LanmanServer -StartupType Automatic
if ((Get-Service -Name LanmanServer).Status -ne "Running") {
  Start-Service -Name LanmanServer
}

# NTFS: Everyone gets Modify on this folder and inherited child content.
$acl = Get-Acl -LiteralPath $Path
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
  $everyone,
  "Modify",
  "ContainerInherit,ObjectInherit",
  "None",
  "Allow"
)
$acl.SetAccessRule($rule)
Set-Acl -LiteralPath $Path -AclObject $acl
Log "Granted NTFS Modify to $everyone"

# SMB share: create only if absent; never repoint an existing share silently.
$share = Get-SmbShare -Name $ShareName -ErrorAction SilentlyContinue
if ($share) {
  $existingPath = [IO.Path]::GetFullPath([string]$share.Path).TrimEnd("\")
  $wantedPath = [IO.Path]::GetFullPath($Path).TrimEnd("\")
  if (-not $existingPath.Equals($wantedPath, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Share '$ShareName' already exists at '$($share.Path)'; refusing to repoint it."
  }
  Grant-SmbShareAccess -Name $ShareName -AccountName $everyone -AccessRight Full -Force | Out-Null
  Log "Updated existing \\$env:COMPUTERNAME\$ShareName"
} else {
  New-SmbShare -Name $ShareName -Path $Path -FullAccess $everyone -FolderEnumerationMode AccessBased | Out-Null
  Log "Created \\$env:COMPUTERNAME\$ShareName"
}

# Permit SMB only from the local subnet. This does not enable insecure guest SMB.
$fw = Get-NetFirewallRule -DisplayName $FirewallRuleName -ErrorAction SilentlyContinue
if ($fw) {
  Set-NetFirewallRule -DisplayName $FirewallRuleName -Enabled True -Direction Inbound -Action Allow -Profile Any | Out-Null
  Set-NetFirewallAddressFilter -AssociatedNetFirewallRule $fw -RemoteAddress LocalSubnet | Out-Null
  Set-NetFirewallPortFilter -AssociatedNetFirewallRule $fw -Protocol TCP -LocalPort 445 | Out-Null
} else {
  New-NetFirewallRule -DisplayName $FirewallRuleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 445 -RemoteAddress LocalSubnet -Profile Any | Out-Null
}
Log "Firewall allows TCP 445 from LocalSubnet only"

# Verification.
$share = Get-SmbShare -Name $ShareName -ErrorAction Stop
$access = Get-SmbShareAccess -Name $ShareName | Where-Object {
  $_.AccountName -eq $everyone -and $_.AccessControlType -eq "Allow"
}
if (-not $access -or ($access.AccessRight -notcontains "Full")) {
  throw "SMB share exists but Everyone Full access was not verified."
}

$aclCheck = Get-Acl -LiteralPath $Path
$ntfsOk = $aclCheck.Access | Where-Object {
  $_.IdentityReference -eq $everyone -and
  $_.AccessControlType -eq "Allow" -and
  (($_.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::Modify) -ne 0)
}
if (-not $ntfsOk) {
  throw "NTFS Modify access for Everyone was not verified."
}

$tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 445 -WarningAction SilentlyContinue
if (-not $tcp.TcpTestSucceeded) {
  throw "Local SMB listener on TCP 445 did not verify."
}

$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -ExpandProperty IPAddress -Unique

Write-Host "PASS // NETWORK SHARE READY" -ForegroundColor Green
Write-Host ("UNC  // \\" + $env:COMPUTERNAME + "\" + $ShareName) -ForegroundColor Cyan
Write-Host ("PATH // " + $share.Path)
Write-Host ("ACCESS // " + $everyone + " = SMB Full / NTFS Modify")
if ($ips) {
  Write-Host ("IP   // " + ($ips -join ", "))
}
Write-Host "SECURITY // SMB ingress limited to LocalSubnet; insecure guest access was not enabled."
