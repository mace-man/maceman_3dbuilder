#!/usr/bin/env bash
# mace-man 3D Builder Launcher (macOS / Linux / Git Bash)
cd "$(dirname "$0")"

echo "==================================================="
echo "  Starting mace-man 3D Builder..."
echo "==================================================="

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies (First time setup)..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies."
        exit 1
    fi
fi

echo "Opening browser at http://localhost:3000/ ..."
if command -v open > /dev/null; then
    open "http://localhost:3000/"
elif command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:3000/"
fi

echo "Starting local server..."
npm run dev
