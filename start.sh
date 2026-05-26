#!/bin/bash
# Start BMAD Studio.
#
# Usage:
#   ./start.sh                  → Prompts you for a project name, creates it,
#                                 installs BMAD, and launches Studio pointed
#                                 at the new project.
#   ./start.sh <project-dir>    → Launches Studio pointed at the given path.
#                                 Installs BMAD into the folder if missing.
#
# Examples:
#   ./start.sh
#   ./start.sh ~/Projects/bb1/lufthansa-q1-2026
#   ./start.sh lufthansa-q1-2026          # short form → ~/BMAD-projects/<name>

set -e

PROJECT="$1"

# Node version sanity check: BMAD requires >=20.12, this fork tested on Node 22.
NODE_MAJOR="$(node -p 'process.versions.node.split(".").map(Number)[0]' 2>/dev/null || echo 0)"
NODE_MINOR="$(node -p 'process.versions.node.split(".").map(Number)[1]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 12 ]; }; then
  echo "✗ Node version $(node --version 2>/dev/null || echo "missing") is too old. Need Node 20.12+ (Node 22 recommended)."
  echo "  If you use nvm:  nvm install 22 && nvm use 22"
  exit 1
fi

# Make sure Studio itself is built. If dist/ is missing, build now.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SCRIPT_DIR/packages/server/dist/index.js" ]; then
  echo "→ Studio not built yet. Running build..."
  (cd "$SCRIPT_DIR" && npm install && npm run build)
fi

# Interactive prompt when no project was passed.
if [ -z "$PROJECT" ]; then
  BMAD_PROJECTS_DIR="$HOME/BMAD-projects"

  # Discover existing projects (subdirs of ~/BMAD-projects/ that contain _bmad/).
  EXISTING_PROJECTS=()
  if [ -d "$BMAD_PROJECTS_DIR" ]; then
    for dir in "$BMAD_PROJECTS_DIR"/*/; do
      [ -d "${dir}_bmad" ] || continue
      EXISTING_PROJECTS+=("$(basename "$dir")")
    done
  fi

  echo ""
  echo "Where do you want your BMAD project?"
  if [ ${#EXISTING_PROJECTS[@]} -gt 0 ]; then
    echo ""
    echo "  Existing projects:"
    for i in "${!EXISTING_PROJECTS[@]}"; do
      printf "    %d. %s\n" "$((i+1))" "${EXISTING_PROJECTS[$i]}"
    done
    echo ""
    echo "  Type a number above, a new name, a full path, or Enter for the default."
  else
    echo "  • Enter a name (e.g. 'lufthansa-q1') → saved under ~/BMAD-projects/<name>"
    echo "  • Or a full path (e.g. '~/Documents/my-analysis')"
    echo "  • Press Enter to accept the default: ~/BMAD-projects/default"
  fi
  echo ""
  read -r -p "> " USER_INPUT

  if [ -z "$USER_INPUT" ]; then
    PROJECT="$BMAD_PROJECTS_DIR/default"
  elif [[ "$USER_INPUT" =~ ^[0-9]+$ ]] && [ "$USER_INPUT" -ge 1 ] && [ "$USER_INPUT" -le "${#EXISTING_PROJECTS[@]}" ]; then
    PROJECT="$BMAD_PROJECTS_DIR/${EXISTING_PROJECTS[$((USER_INPUT-1))]}"
  elif [[ "$USER_INPUT" == /* ]]; then
    PROJECT="$USER_INPUT"
  elif [[ "$USER_INPUT" == "~"* ]]; then
    PROJECT="${USER_INPUT/#\~/$HOME}"
  else
    PROJECT="$BMAD_PROJECTS_DIR/$USER_INPUT"
  fi
  echo ""
fi

# Resolve to absolute path and create the directory if needed.
mkdir -p "$PROJECT"
PROJECT="$(cd "$PROJECT" && pwd)"

# Install BMAD into the project if it has not been done yet.
if [ ! -d "$PROJECT/_bmad" ]; then
  echo "→ No BMAD project found at $PROJECT. Installing..."
  npx --yes bmad-method install \
    --directory "$PROJECT" \
    --modules bmm \
    --tools claude-code \
    --yes
  echo ""
fi

echo "→ Starting BMAD Studio pointed at $PROJECT"
echo "  Open http://127.0.0.1:4040 (or 4041 if 4040 is taken) in your browser."
echo "  Press Ctrl+C to stop."
echo ""
cd "$SCRIPT_DIR"
exec node packages/server/dist/index.js --dir "$PROJECT"
