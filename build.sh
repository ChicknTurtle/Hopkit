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

# ensure package.json exists
if [ ! -f "package.json" ]; then
  echo "ERROR: package.json not found in repo root." >&2
  exit 1
fi

# read metadata from package.json (safe, single-line output)
read -r NAME DISPLAY VERSION <<EOF
$(python3 - <<'PY'
import json,re,sys
d=json.load(open('package.json'))
name = d.get('name','app')
display = d.get('displayName', d.get('name','App'))
version = d.get('version','0.0.0')
display = re.sub(r'[^A-Za-z0-9._-]','',display)
# print space-separated triple; caller will split
print(name, display, version)
PY
)
EOF

# ensure SRCDIR exists
if [ ! -d "$SRCDIR" ]; then
  echo "ERROR: source directory '$SRCDIR' not found. Put your app files in '$SRCDIR' or set SRCDIR accordingly." >&2
  exit 1
fi

echo "Building ${DISPLAY} (package name: ${NAME}) version ${VERSION}"
echo "NW.js: ${NW_VERSION} arch: ${ARCH}"

# cached download: human messages -> stderr; path printed to stdout only
cached_download() {
  local url="$1"
  local outname="$2"
  local outpath="$CACHE_DIR/$outname"

  if [ -f "$outpath" ]; then
    echo "Using cached $outname" >&2
  else
    echo "Downloading $outname" >&2
    curl -L -sS -o "$outpath" "$url"
  fi

  # final path on stdout (single line)
  printf '%s' "$outpath"
}

# helper: verify a downloaded file exists
ensure_file() {
  local f="$1"
  if [ -z "$f" ] || [ ! -f "$f" ]; then
    echo "ERROR: expected file '$f' not found." >&2
    return 1
  fi
  return 0
}

# clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# macOS build (app bundle, recommended: app.nw as folder)
build_macos() {
  echo "=== macOS build ==="
  local file="nwjs-${NW_VERSION}-osx-${ARCH}.zip"
  local url="https://dl.nwjs.io/${NW_VERSION}/${file}"
  local zip
  zip=$(cached_download "$url" "$file")

  if ! ensure_file "$zip"; then
    echo "mac build: download missing, skipping mac build." >&2
    return 1
  fi

  local tmpdir
  tmpdir=$(mktemp -d)
  unzip -q "$zip" -d "$tmpdir" || true

  local nw_app
  nw_app=$(find "$tmpdir" -type d -name "nwjs.app" -print -quit || true)
  if [ -z "$nw_app" ]; then
    nw_app=$(find "$tmpdir" -maxdepth 2 -type d -name "*.app" -print -quit || true)
  fi
  if [ -z "$nw_app" ]; then
    echo "nwjs.app not found in archive for mac build" >&2
    rm -rf "$tmpdir"
    return 1
  fi

  local OUT_APP="${BUILD_DIR}/${DISPLAY}.app"
  rm -rf "$OUT_APP"
  cp -R "$nw_app" "$OUT_APP"

  local APP_NW_DIR="${OUT_APP}/Contents/Resources/app.nw"
  rm -rf "$APP_NW_DIR"
  mkdir -p "$APP_NW_DIR"
  cp -R "${SRCDIR}/." "$APP_NW_DIR/"

  local PLIST="${OUT_APP}/Contents/Info.plist"
  if [ -f "icon.icns" ]; then
    cp "icon.icns" "${OUT_APP}/Contents/Resources/app.icns" || true
    if command -v /usr/libexec/PlistBuddy >/dev/null 2>&1 && [ -f "$PLIST" ]; then
      /usr/libexec/PlistBuddy -c "Set :CFBundleName ${DISPLAY}" "$PLIST" || true
      /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName ${DISPLAY}" "$PLIST" || true
      /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile app.icns" "$PLIST" || true
    fi
  fi

  mkdir -p "$DIST_DIR"
  cp -R "$OUT_APP" "$DIST_DIR/${DISPLAY}.app"
  (cd "$BUILD_DIR" && zip -r -q "../${DIST_DIR}/${DISPLAY}.app.zip" "$(basename "$OUT_APP")")

  rm -rf "$tmpdir"
  echo "mac: produced ${DIST_DIR}/${DISPLAY}.app (bundle) and ${DIST_DIR}/${DISPLAY}.app.zip"
}

# Windows build (runtime + app files; also produce concatenated exe if possible)
build_windows() {
  echo "=== Windows build ==="
  local file="nwjs-${NW_VERSION}-win-${ARCH}.zip"
  local url="https://dl.nwjs.io/${NW_VERSION}/${file}"
  local zip
  zip=$(cached_download "$url" "$file")

  if ! ensure_file "$zip"; then
    echo "windows build: download missing, skipping windows build." >&2
    return 1
  fi

  local tmpdir
  tmpdir=$(mktemp -d)
  unzip -q "$zip" -d "$tmpdir" || true

  local TOPDIR
  TOPDIR=$(find "$tmpdir" -maxdepth 1 -type d -name "nwjs*" -print -quit || true)
  if [ -z "$TOPDIR" ]; then TOPDIR="$tmpdir"; fi

  local OUT_DIR="${BUILD_DIR}/${DISPLAY}-win"
  rm -rf "$OUT_DIR"
  mkdir -p "$OUT_DIR"
  cp -R "$TOPDIR/"* "$OUT_DIR/" || true

  mkdir -p "${OUT_DIR}/${NAME}-files"
  cp -R "${SRCDIR}/." "${OUT_DIR}/${NAME}-files/"

  local PKGZIP="${BUILD_DIR}/package.nw"
  (cd "${SRCDIR}" && zip -r -q "${PKGZIP}" .) || true

  local NW_EXE
  NW_EXE="$(find "$OUT_DIR" -maxdepth 1 -type f -iname 'nw.exe' -print -quit || true)"
  if [ -z "$NW_EXE" ]; then
    echo "nw.exe not found in extracted runtime; windows single-exe will not be created" >&2
  else
    local DIST_EXE="${DIST_DIR}/${DISPLAY}.exe"
    if command -v cat >/dev/null 2>&1; then
      cat "$NW_EXE" "$PKGZIP" > "${DIST_EXE}"
      chmod +x "${DIST_EXE}" || true
      echo "windows: produced single-file ${DIST_EXE} (may still need runtime files to run reliably)"
    else
      echo "cat not available; skipping single-file exe creation" >&2
    fi
  fi

  mkdir -p "$DIST_DIR"
  (cd "$BUILD_DIR" && zip -r -q "../${DIST_DIR}/${DISPLAY}-win-${VERSION}.zip" "$(basename "$OUT_DIR")") || true

  rm -rf "$tmpdir" "$PKGZIP"
}

# Linux build -> AppImage (requires appimagetool)
build_linux() {
  echo "=== Linux build ==="
  local file="nwjs-${NW_VERSION}-linux-${ARCH}.zip"
  local url="https://dl.nwjs.io/${NW_VERSION}/${file}"
  local zip
  zip=$(cached_download "$url" "$file")

  if ! ensure_file "$zip"; then
    echo "linux build: download missing, skipping linux build." >&2
    return 1
  fi

  local tmpdir
  tmpdir=$(mktemp -d)
  unzip -q "$zip" -d "$tmpdir" || true

  local TOPDIR
  TOPDIR=$(find "$tmpdir" -maxdepth 1 -type d -name "nwjs*" -print -quit || true)
  if [ -z "$TOPDIR" ]; then TOPDIR="$tmpdir"; fi

  local APPDIR="${BUILD_DIR}/${DISPLAY}.AppDir"
  rm -rf "$APPDIR"
  mkdir -p "$APPDIR/usr/bin" "$APPDIR/usr/share/icons/hicolor/256x256/apps"

  cp -R "$TOPDIR/"* "$APPDIR/" || true

  mkdir -p "${APPDIR}/usr/share/${NAME}"
  cp -R "${SRCDIR}/." "${APPDIR}/usr/share/${NAME}/"

  cat > "${APPDIR}/AppRun" <<'AR'
#!/usr/bin/env bash
HERE="$(dirname "$(readlink -f "${0}")")"
# run the nw binary from inside the AppDir; prefer ./nw or usr/bin/nw
if [ -x "$HERE/nw" ]; then
  exec "$HERE/nw" "$HERE/usr/share/APPDIR_APP_NAME" "$@"
elif [ -x "$HERE/usr/bin/nw" ]; then
  exec "$HERE/usr/bin/nw" "$HERE/usr/share/APPDIR_APP_NAME" "$@"
else
  echo "nw binary not found in AppImage"
  exit 1
fi
AR

# replace placeholder with actual NAME path
sed -i "s/APPDIR_APP_NAME/${NAME}/g" "${APPDIR}/AppRun"
chmod +x "${APPDIR}/AppRun"

  if [ -f "icon.png" ]; then
    cp "icon.png" "${APPDIR}/usr/share/icons/hicolor/256x256/apps/${DISPLAY}.png" || true
  fi

  # ensure appimagetool exists in cache
  if [ ! -f "$APPIMAGETOOL" ]; then
    echo "Downloading appimagetool into cache" >&2
    curl -L -sS -o "$APPIMAGETOOL" "https://github.com/AppImage/appimagetool/releases/latest/download/appimagetool-x86_64.AppImage"
    chmod +x "$APPIMAGETOOL" || true
  else
    echo "Using cached appimagetool" >&2
  fi

  if [ ! -x "$APPIMAGETOOL" ]; then
    echo "ERROR: appimagetool not available or not executable at $APPIMAGETOOL" >&2
    rm -rf "$tmpdir"
    return 1
  fi

  (cd "$BUILD_DIR" && "$APPIMAGETOOL" "${APPDIR}" "${DIST_DIR}/${DISPLAY}.AppImage") || {
    echo "appimagetool failed to create AppImage" >&2
    rm -rf "$tmpdir"
    return 1
  }

  chmod +x "${DIST_DIR}/${DISPLAY}.AppImage" || true
  echo "linux: produced ${DIST_DIR}/${DISPLAY}.AppImage"

  rm -rf "$tmpdir"
}

# run builds (best-effort; continue on single-platform failures)
build_macos || echo "mac build failed (continuing)" >&2
build_windows || echo "windows build failed (continuing)" >&2
build_linux || echo "linux build failed (continuing)" >&2

echo "Artifacts in ${DIST_DIR}:"
ls -la "$DIST_DIR" || true