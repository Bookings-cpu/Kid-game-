#!/usr/bin/env bash
# Copy the game's web assets from the repo root into the Capacitor www/ folder,
# then run `npx cap sync` to push them into the native android project.
# Run this before every Android build.
set -e
cd "$(dirname "$0")"
mkdir -p www
cp ../index.html ../game.js ../renderer3d.js ../three.min.js ../style.css \
   ../manifest.json ../icon-192.png ../icon-512.png www/
rm -rf www/fonts && cp -r ../fonts www/fonts
echo "synced game assets -> app/www"
