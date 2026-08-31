#!/usr/bin/env bash
#
# Genera los zips listos para subir a la Chrome Web Store y a AMO.
#
#   ./agent-docs/publicacion-extension/empaquetar.sh
#   → dist-extension/chrome.zip
#   → dist-extension/firefox.zip
#
# Las dos tiendas exigen el manifest en la RAÍZ del zip, no dentro de una
# subcarpeta. El de Firefox se arma desde manifest.firefox.json.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ORIGEN="$RAIZ/extension"
SALIDA="$RAIZ/dist-extension"

command -v zip >/dev/null || { echo "Falta 'zip'. Instálalo con: sudo pacman -S zip"; exit 1; }

VERSION="$(node -p "require('$ORIGEN/manifest.json').version")"
VERSION_FX="$(node -p "require('$ORIGEN/manifest.firefox.json').version")"

if [[ "$VERSION" != "$VERSION_FX" ]]; then
  echo "Las versiones no coinciden: chrome=$VERSION firefox=$VERSION_FX"
  echo "Corrígelo en los dos manifests antes de empaquetar."
  exit 1
fi

echo "Empaquetando la versión $VERSION"
rm -rf "$SALIDA/tmp" && mkdir -p "$SALIDA/tmp"

# Lo que va dentro del paquete. Todo lo demás (README, manifests de la otra
# tienda) se queda fuera para no engordar la revisión.
copiar_comunes() {
  local destino="$1"
  mkdir -p "$destino"
  cp -r "$ORIGEN/src" "$ORIGEN/icons" "$destino/"
}

# --- Chrome ---
copiar_comunes "$SALIDA/tmp/chrome"
cp "$ORIGEN/manifest.json" "$SALIDA/tmp/chrome/manifest.json"
rm -f "$SALIDA/chrome.zip"
(cd "$SALIDA/tmp/chrome" && zip -qr "$SALIDA/chrome.zip" .)

# --- Firefox ---
# Se queda desplegado en firefox-src/ además de comprimido: es lo que necesitan
# `web-ext lint` y `web-ext run`, que trabajan sobre un directorio.
rm -rf "$SALIDA/firefox-src"
copiar_comunes "$SALIDA/firefox-src"
cp "$ORIGEN/manifest.firefox.json" "$SALIDA/firefox-src/manifest.json"
rm -f "$SALIDA/firefox.zip"
(cd "$SALIDA/firefox-src" && zip -qr "$SALIDA/firefox.zip" .)

rm -rf "$SALIDA/tmp"

echo
echo "Listo:"
for z in "$SALIDA/chrome.zip" "$SALIDA/firefox.zip"; do
  printf '  %-28s %s\n' "$(basename "$z")" "$(du -h "$z" | cut -f1)"
  # El manifest tiene que ser una entrada de primer nivel.
  unzip -l "$z" | grep -q ' manifest.json$' || { echo "  ERROR: manifest.json no está en la raíz de $z"; exit 1; }
done

echo
echo "Siguiente paso: 01-chrome-web-store.md y 02-firefox-amo.md"
echo "Antes de subir a Firefox, pasa el linter:"
echo "  pnpm dlx web-ext lint --source-dir $SALIDA/firefox-src --self-hosted"
