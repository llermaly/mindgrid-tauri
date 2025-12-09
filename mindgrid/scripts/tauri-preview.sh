#!/bin/bash

# Tauri Preview Script
# Automatically finds an available port and runs tauri dev
# Usage: ./scripts/tauri-preview.sh [port]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base port for previews (will increment if busy)
BASE_PORT=${1:-1430}
MAX_ATTEMPTS=20

# Find available port
find_available_port() {
    local port=$BASE_PORT
    local attempts=0

    while [ $attempts -lt $MAX_ATTEMPTS ]; do
        if ! lsof -i:$port >/dev/null 2>&1; then
            echo $port
            return 0
        fi
        port=$((port + 2))  # +2 to leave room for HMR port
        attempts=$((attempts + 1))
    done

    echo "ERROR: Could not find available port after $MAX_ATTEMPTS attempts" >&2
    exit 1
}

PORT=$(find_available_port)

echo -e "${BLUE}[PREVIEW]${NC} Starting on port ${GREEN}$PORT${NC}"
echo -e "${BLUE}[PREVIEW]${NC} Window title will show: MindGrid [PREVIEW :$PORT]"
echo ""

# Create temporary tauri config with dynamic port
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MINDGRID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMP_CONFIG=$(mktemp)

cat > "$TEMP_CONFIG" << EOF
{
  "\$schema": "https://schema.tauri.app/config/2",
  "productName": "mindgrid-preview-$PORT",
  "version": "0.1.0",
  "identifier": "com.ichnaea.mindgrid.preview.$PORT",
  "build": {
    "beforeDevCommand": "MINDGRID_PORT=$PORT npm run dev:dynamic",
    "devUrl": "http://localhost:$PORT",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "MindGrid [PREVIEW :$PORT]",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ],
    "security": {
      "csp": null
    },
    "withGlobalTauri": true
  },
  "plugins": {
    "sql": {
      "preload": ["sqlite:mindgrid-preview-$PORT.db"]
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
EOF

# Cleanup temp file on exit
cleanup() {
    rm -f "$TEMP_CONFIG"
}
trap cleanup EXIT

# Run tauri with the temporary config
cd "$MINDGRID_DIR"
MINDGRID_PORT=$PORT tauri dev --config "$TEMP_CONFIG"
