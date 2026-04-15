#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RES_SRC="$PROJECT_DIR/resources/android"
RES_DEST="$PROJECT_DIR/android/app/src/main/res"

for density in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi; do
  if [ -d "$RES_SRC/$density" ]; then
    mkdir -p "$RES_DEST/$density"
    cp -f "$RES_SRC/$density/"* "$RES_DEST/$density/"
    echo "Copied $density icons"
  fi
done

echo "Android icons updated!"
