#!/bin/bash
# Start BMAD Studio pointed at a project. Installs BMAD into the project the
# first time, then launches Studio.
#
# Usage:
#   ./start.sh <project-dir>
#
# Example:
#   ./start.sh ~/Projects/bb1/bmad

set -e

PROJECT="$1"
if [ -z "$PROJECT" ]; then
  echo "Usage: ./start.sh <project-dir>"
  echo "Example: ./start.sh ~/Projects/bb1/bmad"
  exit 1
fi

# Resolve to absolute path
PROJECT="$(cd "$(dirname "$PROJECT")" 2>/dev/null && pwd)/$(basename "$PROJECT")"

# Make sure the project dir exists
mkdir -p "$PROJECT"

# Node version sanity check: BMAD requires >=20.12, this fork tested on Node 22.
NODE_MAJOR="$(node -p 'process.versions.node.split(".").map(Number)[0]' 2>/dev/null || echo 0)"
NODE_MINOR="$(node -p 'process.versions.node.split(".").map(Number)[1]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 12 ]; }; then
  echo "✗ Node version $(node --version 2>/dev/null || echo "missing") is too old. Need Node 20.12+ (Node 22 recommended)."
  echo "  If you use nvm:  nvm install 22 && nvm use 22"
  exit 1
fi

# Install BMAD into the project if it has not been done yet.
if [ ! -d "$PROJECT/_bmad" ]; then
  echo "→ No BMAD project found at $PROJECT. Installing..."
  npx --yes bmad-method install \
    --directory "$PROJECT" \
    --modules bmm \
    --tools claude-code \
    --yes
fi

# Make sure Studio itself is built. If dist/ is missing, build now.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SCRIPT_DIR/packages/server/dist/index.js" ]; then
  echo "→ Studio not built yet. Running build..."
  (cd "$SCRIPT_DIR" && npm install && npm run build)
fi

# Launch Studio pointed at the project. Output goes to stdout; Ctrl+C to stop.
echo "→ Starting BMAD Studio pointed at $PROJECT"
echo "  Open http://127.0.0.1:4040 (or 4041 if 4040 is taken) in your browser."
echo "  Press Ctrl+C to stop."
echo ""
cd "$SCRIPT_DIR"
exec node packages/server/dist/index.js --dir "$PROJECT"
