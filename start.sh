#!/bin/bash
cd "$(dirname "$0")"

echo "============================================"
echo "  LAN Chess - starting up"
echo "============================================"
echo

if ! command -v node &> /dev/null; then
    echo "Node.js was not found on this computer."
    echo "Please install it first from https://nodejs.org"
    echo "(choose the LTS version, then run this file again)"
    echo
    read -p "Press Enter to close..."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing required files, this only happens once..."
    npm install
    echo
fi

node menu.js
