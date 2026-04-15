#!/bin/bash
DIST="$(cd "$(dirname "$0")/.." && pwd)/dist/public"

echo "Stripping web-only files from $DIST ..."

rm -f "$DIST/logo.png"
rm -f "$DIST/opengraph.png"
rm -f "$DIST/opengraph.jpg"
rm -f "$DIST/feature-graphic.png"
rm -f "$DIST/icon-512.png"
rm -f "$DIST/icon-192.png"
rm -f "$DIST/privacy.html"
rm -f "$DIST/manifest.json"
rm -f "$DIST/favicon.svg"

echo "Done — removed web-only assets from APK build."
