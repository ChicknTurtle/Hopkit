#!/usr/bin/env bash
set -euo pipefail

# config
NW_VERSION="${NW_VERSION:-v0.108.0}"
ARCH="${ARCH:-x64}"
SRCDIR="${SRCDIR:-src}"
CACHE_DIR="${CACHE_DIR:-./nwjs-cache}"
BUILD_DIR="${BUILD_DIR:-./build}"
DIST_DIR="${DIST_DIR:-./dist}"
APPIMAGETOOL="${CACHE_DIR}/appimagetool-x86_64.AppImage"

mkdir -p "$CACHE_DIR" "$BUILD_DIR" "$DIST_DIR"

# read metadata from package.json
read -r NAME DISPLAY VERSION <<EOF
$(python3 - <<PY
import json,sys,re
d=json.load(open('package.json'))
name = d.get('name','app')
display = d.get('displayName', d.get('name','App'))
version = d.get('version','0.0.0')
# sanitize display for filenames: keep letters, numbers, dash, underscore
display = re.sub(r'[^A-Za-z0-9._-]','',display)
print(name, display, version)
PY
)
EOF

echo "Building ${DISPLAY} (package name: ${NAME}) version ${VERSION}"
echo "NW.js: ${NW_VERSION} arch: ${ARCH}"

# cached download
cached_download() {
  local url="$1"; local outname="$2"
  local outpath="$CACHE_DIR/$outname"
  if [ -f "$outpath" ]; then
    echo "Using cached $outname"
  else
    echo "Downloading $outname"
    curl -L -sS -o "$outpath" "$url"
  fi
  echo "$outpath"
}

# clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# macos
build_macos() {
  echo "=== macOS build ==="
  local file="nwjs-${NW_VERSION}-osx-${ARCH}.zip"
  local url="https://dl.nwjs.io/${NW_VERSION}/${file}"
  local zip=$(cached_download "$url" "$file")

  tmp=$(mktemp -d)
  unzip -q "$zip" -d "$tmp"
  NW_APP=$(find "$tmp" -type d -name "nwjs.app" -print -quit || true)
  if [ -z "$NW_APP" ]; then
    NW_APP=$(find "$tmp" -maxdepth 2 -type d -name "*.app" -print -quit || true)
  fi
  if [ -z "$NW_APP" ]; then
    echo "nwjs.app not found in archive"
    rm -rf "$tmp"
    return 1
  fi

  OUT_APP="${BUILD_DIR}/${DISPLAY}.app"
  rm -rf "$OUT_APP"
  cp -R "$NW_APP" "$OUT_APP"

  APP_NW_DIR="${OUT_APP}/Contents/Resources/app.nw"
  rm -rf "$APP_NW_DIR"
  mkdir -p "$APP_NW_DIR"
  cp -R "${SRCDIR}/." "$APP_NW_DIR/"

  PLIST="${OUT_APP}/Contents/Info.plist"
  if [ -f "icon.icns" ]; then
    cp "icon.icns" "${OUT_APP}/Contents/Resources/app.icns" || true
    if command -v /usr/libexec/PlistBuddy >/dev/null 2>&1; then
      /usr/libexec/PlistBuddy -c "Set :CFBundleName ${DISPLAY}" "$PLIST" || true
      /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName ${DISPLAY}" "$PLIST" || true
      /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile app.icns" "$PLIST" || true
    fi
  fi

  mkdir -p "$DIST_DIR"
  cp -R "$OUT_APP" "$DIST_DIR/${DISPLAY}.app"
  (cd "$BUILD_DIR" && zip -r -q "../${DIST_DIR}/${DISPLAY}.app.zip" "$(basename "$OUT_APP")")

  rm -rf "$tmp"
  echo "mac: produced ${DIST_DIR}/${DISPLAY}.app (bundle) and ${DIST_DIR}/${DISPLAY}.app.zip"
}

# windows
build_windows() {
  echo "=== Windows build ==="
  local file="nwjs-${NW_VERSION}-win-${ARCH}.zip"
  local url="https://dl.nwjs.io/${NW_VERSION}/${file}"
  local zip=$(cached_download "$url" "$file")

  tmp=$(mktemp -d)
  unzip -q "$zip" -d "$tmp"

  TOPDIR=$(find "$tmp" -maxdepth 1 -type d -name "nwjs*" -print -quit || true)
  if [ -z "$TOPDIR" ]; then TOPDIR="$tmp"; fi

  OUT_DIR="${BUILD_DIR}/${DISPLAY}-win"
  rm -rf "$OUT_DIR"
  mkdir -p "$OUT_DIR"
  cp -R "$TOPDIR/"* "$OUT_DIR/"

  mkdir -p "${OUT_DIR}/${NAME}-files"
  cp -R "${SRCDIR}/." "${OUT_DIR}/${NAME}-files/"

  PKGZIP="${BUILD_DIR}/package.nw"
  (cd "${SRCDIR}" && zip -r -q "../${PKGZIP}" .)

  NW_EXE="$(find "$OUT_DIR" -maxdepth 1 -type f -iname 'nw.exe' -print -quit || true)"
  if [ -z "$NW_EXE" ]; then
    echo "nw.exe not found in extracted runtime"
  else
    DIST_EXE="${DIST_DIR}/${DISPLAY}.exe"
    if command -v cat >/dev/null 2>&1; then
      cat "$NW_EXE" "$PKGZIP" > "${DIST_EXE}"
      chmod +x "${DIST_EXE}" || true
      echo "windows: produced single-file ${DIST_EXE} (note: some runtime files may still be required alongside this exe)"
    else
      echo "cat not available; skipping single-file exe creation"
    fi
  fi

  mkdir -p "$DIST_DIR"
  (cd "$BUILD_DIR" && zip -r -q "../${DIST_DIR}/${DISPLAY}-win-${VERSION}.zip" "$(basename "$OUT_DIR")")

  rm -rf "$tmp" "$PKGZIP"
}

# linux
build_linux() {
  echo "=== Linux build ==="
  local file="nwjs-${NW_VERSION}-linux-${ARCH}.zip"
  local url="https://dl.nwjs.io/${NW_VERSION}/${file}"
  local zip=$(cached_download "$url" "$file")

  tmp=$(mktemp -d)
  unzip -q "$zip" -d "$tmp"
  TOPDIR=$(find "$tmp" -maxdepth 1 -type d -name "nwjs*" -print -quit || true)
  if [ -z "$TOPDIR" ]; then TOPDIR="$tmp"; fi

  APPDIR="${BUILD_DIR}/${DISPLAY}.AppDir"
  rm -rf "$APPDIR"
  mkdir -p "$APPDIR/usr/bin" "$APPDIR/usr/share/icons/hicolor/256x256/apps"

  cp -R "$TOPDIR/"* "$APPDIR/"

  mkdir -p "${APPDIR}/usr/share/${NAME}"
  cp -R "${SRCDIR}/." "${APPDIR}/usr/share/${NAME}/"

  cat > "${APPDIR}/AppRun" <<AR
#!/usr/bin/env bash
HERE="\$(dirname "\$(readlink -f "\${0}")")"
# run the nw binary from inside the AppDir; prefer ./nw or usr/bin/nw
if [ -x "\$HERE/nw" ]; then
  exec "\$HERE/nw" "\$HERE/usr/share/${NAME}" "\$@"
elif [ -x "\$HERE/usr/bin/nw" ]; then
  exec "\$HERE/usr/bin/nw" "\$HERE/usr/share/${NAME}" "\$@"
else
  echo "nw binary not found in AppImage"
  exit 1
fi
AR
  chmod +x "${APPDIR}/AppRun"

  if [ -f "icon.png" ]; then
    cp "icon.png" "${APPDIR}/usr/share/icons/hicolor/256x256/apps/${DISPLAY}.png" || true
  fi

  if [ ! -f "$APPIMAGETOOL" ]; then
    echo "Downloading appimagetool"
    curl -L -sS -o "$APPIMAGETOOL" "https://github.com/AppImage/appimagetool/releases/latest/download/appimagetool-x86_64.AppImage"
    chmod +x "$APPIMAGETOOL"
  else
    echo "Using cached appimagetool"
  fi

  (cd "$BUILD_DIR" && "$APPIMAGETOOL" "${APPDIR}" "${DIST_DIR}/${DISPLAY}.AppImage")
  chmod +x "${DIST_DIR}/${DISPLAY}.AppImage"
  echo "linux: produced ${DIST_DIR}/${DISPLAY}.AppImage"
  rm -rf "$tmp"
}

# run builds
build_macos || echo "mac build failed (continuing)"
build_windows || echo "windows build failed (continuing)"
build_linux || echo "linux build failed (continuing)"

echo "Artifacts in ${DIST_DIR}:"
ls -la "$DIST_DIR" || true