#!/usr/bin/env bash
set -e

NW_VERSION=${NW_VERSION:-v0.108.0}
SRC=${SRCDIR:-src}
CACHE=nwjs-cache
BUILD=build
DIST=dist

mkdir -p "$CACHE" "$BUILD" "$DIST"

NAME=$(python3 - <<EOF
import json,re
p=json.load(open("package.json"))
print(re.sub(r"[^A-Za-z0-9._-]","",p.get("name","app")))
EOF
)

DISPLAY=$(python3 - <<EOF
import json,re
p=json.load(open("package.json"))
print(re.sub(r"[^A-Za-z0-9._-]","",p.get("displayName",p["name"])))
EOF
)

VERSION=$(python3 - <<EOF
import json
print(json.load(open("package.json"))["version"])
EOF
)

echo "Building $DISPLAY $VERSION"

rm -rf "$BUILD"
mkdir "$BUILD"

################################
# prepare app package
################################

APP_PACKAGE="$BUILD/package.nw"
mkdir "$BUILD/app"
cp -r "$SRC"/. "$BUILD/app/"
cp package.json "$BUILD/app/" || true
[ -f icon.png ] && cp icon.png "$BUILD/app/"
(cd "$BUILD/app" && zip -qr "../package.nw" .)

################################
# download helper
################################

download() {
    URL=$1
    FILE=$2
    if [ ! -f "$CACHE/$FILE" ]; then
        echo "Downloading $FILE"
        curl -L "$URL" -o "$CACHE/$FILE"
    fi
}

################################
# Windows
################################

download \
"https://dl.nwjs.io/$NW_VERSION/nwjs-$NW_VERSION-win-x64.zip" \
"nw-win.zip"

rm -rf "$BUILD/win"
mkdir "$BUILD/win"

unzip -q "$CACHE/nw-win.zip" -d "$BUILD/win"
WIN_DIR=$(find "$BUILD/win" -maxdepth 1 -type d -name "nwjs-*")

cat "$WIN_DIR/nw.exe" "$APP_PACKAGE" > "$DIST/$DISPLAY.exe"

################################
# macOS
################################

download \
"https://dl.nwjs.io/$NW_VERSION/nwjs-$NW_VERSION-osx-x64.zip" \
"nw-mac.zip"

rm -rf "$BUILD/mac"
mkdir "$BUILD/mac"

unzip -q "$CACHE/nw-mac.zip" -d "$BUILD/mac"
MAC_DIR=$(find "$BUILD/mac" -maxdepth 1 -type d -name "nwjs-*")

cp -r "$MAC_DIR/nwjs.app" "$DIST/$DISPLAY.app"

APPDIR="$DIST/$DISPLAY.app/Contents/Resources/app.nw"
mkdir -p "$APPDIR"
unzip -q "$APP_PACKAGE" -d "$APPDIR"

[ -f icon.icns ] && cp icon.icns "$DIST/$DISPLAY.app/Contents/Resources/app.icns"

################################
# Linux
################################

download \
"https://dl.nwjs.io/$NW_VERSION/nwjs-$NW_VERSION-linux-x64.tar.gz" \
"nw-linux.tar.gz"

rm -rf "$BUILD/linux"
mkdir "$BUILD/linux"

tar -xzf "$CACHE/nw-linux.tar.gz" -C "$BUILD/linux"
LINUX_DIR=$(find "$BUILD/linux" -maxdepth 1 -type d -name "nwjs-*")

cat "$LINUX_DIR/nw" "$APP_PACKAGE" > "$BUILD/$DISPLAY"
chmod +x "$BUILD/$DISPLAY"

################################
# AppImage
################################

APPDIR="$BUILD/AppDir"
mkdir -p "$APPDIR/usr/bin"

cp "$BUILD/$DISPLAY" "$APPDIR/usr/bin/$DISPLAY"

cat > "$APPDIR/AppRun" <<EOF
#!/bin/sh
exec "\$APPDIR/usr/bin/$DISPLAY"
EOF

chmod +x "$APPDIR/AppRun"

cat > "$APPDIR/$DISPLAY.desktop" <<EOF
[Desktop Entry]
Name=$DISPLAY
Exec=$DISPLAY
Icon=$DISPLAY
Type=Application
Categories=Utility;
EOF

cp icon.png "$APPDIR/$DISPLAY.png" 2>/dev/null || true

if [ ! -f "$CACHE/appimagetool" ]; then
    curl -L https://github.com/AppImage/appimagetool/releases/latest/download/appimagetool-x86_64.AppImage \
    -o "$CACHE/appimagetool"
    chmod +x "$CACHE/appimagetool"
fi

ARCH=x86_64 "$CACHE/appimagetool" "$APPDIR" "$DIST/$DISPLAY.AppImage"

echo "Done"
ls -lh "$DIST"