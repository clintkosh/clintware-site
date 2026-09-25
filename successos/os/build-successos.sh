#!/usr/bin/env bash
set -euo pipefail

# Reproducible SuccessOS live-image scaffold using Debian live-build.
# Run on a Debian-compatible build host with live-build installed.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="${SUCCESSOS_BUILD_DIR:-$ROOT/.build}"
OUT="${SUCCESSOS_OUT_DIR:-$ROOT/dist}"

rm -rf "$WORK"
mkdir -p "$WORK" "$OUT"
cd "$WORK"

lb config \
  --mode debian \
  --architectures amd64 \
  --binary-images iso-hybrid \
  --bootappend-live "boot=live components quiet splash" \
  --debian-installer live \
  --archive-areas "main contrib non-free-firmware" \
  --apt-recommends true \
  --memtest none

mkdir -p config/package-lists
cat > config/package-lists/successos.list.chroot <<'PKGS'
linux-image-amd64
firmware-linux
firmware-linux-free
firmware-linux-nonfree
firmware-iwlwifi
firmware-realtek
firmware-atheros
firmware-mediatek
firmware-amd-graphics
firmware-intel-graphics
firmware-intel-misc
firmware-sof-signed
firmware-brcm80211
firmware-nvidia-graphics
amd64-microcode
intel-microcode
network-manager
wpasupplicant
bluez
pipewire
wireplumber
alsa-utils
xorg
xfce4
xfce4-terminal
lightdm
sudo
polkitd
python3
python3-venv
python3-pip
git
curl
ca-certificates
pciutils
usbutils
lshw
dmidecode
smartmontools
nvme-cli
cryptsetup
parted
gdisk
dosfstools
exfatprogs
ntfs-3g
btrfs-progs
e2fsprogs
squashfs-tools
openssh-client
rsync
jq
PKGS

mkdir -p config/includes.chroot/usr/local/lib/successos
mkdir -p config/includes.chroot/usr/local/bin
mkdir -p config/includes.chroot/etc/successos
mkdir -p config/includes.chroot/opt/successos/models
cp "$ROOT/success_permission.py" config/includes.chroot/usr/local/lib/successos/success_permission.py
cp "$ROOT/success_driver_scan.py" config/includes.chroot/usr/local/bin/success-driver-scan\ncp "$ROOT/success_approve_gui.py" config/includes.chroot/usr/local/lib/successos/success_approve_gui.py\ncp "$ROOT/success_terminal.py" config/includes.chroot/usr/local/bin/success
cp "$ROOT/default-policy.json" config/includes.chroot/etc/successos/default-policy.json
chmod +x config/includes.chroot/usr/local/bin/success-driver-scan\nchmod +x config/includes.chroot/usr/local/bin/success\nchmod +x config/includes.chroot/usr/local/lib/successos/success_approve_gui.py
chmod +x config/includes.chroot/usr/local/lib/successos/success_permission.py

cat > config/includes.chroot/usr/local/bin/success-approve <<'SH'
#!/usr/bin/env bash
exec python3 /usr/local/lib/successos/success_permission.py "$@"
SH
chmod +x config/includes.chroot/usr/local/bin/success-approve

BITNET_BUNDLE="${SUCCESSOS_BITNET_BUNDLE:-$ROOT/dist/bitnet-bundle.tar.gz}"
if [[ -f "$BITNET_BUNDLE" ]]; then
  tar -xzf "$BITNET_BUNDLE" -C config/includes.chroot/opt/successos
else
  cat > config/includes.chroot/opt/successos/models/README <<'TXT'
No BitNet bundle was supplied to this build.
Run prepare-bitnet-bundle.sh first, then rebuild to produce an offline AI image.
TXT
fi

lb build
cp live-image-amd64.hybrid.iso "$OUT/successos-amd64.iso"
sha256sum "$OUT/successos-amd64.iso" | tee "$OUT/successos-amd64.iso.sha256"
echo "Built: $OUT/successos-amd64.iso"
