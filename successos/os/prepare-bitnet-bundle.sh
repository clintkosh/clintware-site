#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="${SUCCESSOS_BITNET_WORK:-$ROOT/.bitnet-build}"
OUT="${SUCCESSOS_BITNET_OUT:-$ROOT/dist}"
MODEL_REPO="${SUCCESSOS_BITNET_MODEL_REPO:-microsoft/BitNet-b1.58-2B-4T-gguf}"
BITNET_REF="${SUCCESSOS_BITNET_REF:-main}"

rm -rf "$WORK"
mkdir -p "$WORK" "$OUT"
python3 -m venv "$WORK/venv"
source "$WORK/venv/bin/activate"
python -m pip install --upgrade pip
python -m pip install "huggingface_hub[cli]"
git clone --recursive https://github.com/microsoft/BitNet.git "$WORK/BitNet"
cd "$WORK/BitNet"
git checkout "$BITNET_REF"
git submodule update --init --recursive
python -m pip install -r requirements.txt
mkdir -p models/BitNet-b1.58-2B-4T
huggingface-cli download "$MODEL_REPO" --local-dir models/BitNet-b1.58-2B-4T
python setup_env.py -md models/BitNet-b1.58-2B-4T -q i2_s
mkdir -p "$WORK/bundle/bitnet" "$WORK/bundle/models/BitNet-b1.58-2B-4T"
cp -a run_inference.py build utils "$WORK/bundle/bitnet/"
cp -a models/BitNet-b1.58-2B-4T/. "$WORK/bundle/models/BitNet-b1.58-2B-4T/"
COMMIT="$(git rev-parse HEAD)"
printf "bitnet_commit=%s\nmodel_repo=%s\nquant=i2_s\n" "$COMMIT" "$MODEL_REPO" > "$WORK/bundle/BITNET-MANIFEST.txt"
(cd "$WORK/bundle" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$WORK/bundle/SHA256SUMS"
tar -C "$WORK/bundle" -czf "$OUT/bitnet-bundle.tar.gz" .
sha256sum "$OUT/bitnet-bundle.tar.gz" > "$OUT/bitnet-bundle.tar.gz.sha256"
echo "Prepared: $OUT/bitnet-bundle.tar.gz"
