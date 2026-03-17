#!/usr/bin/env bash
# Install Claude Multi-Agent Toolkit into the current project.
# Run from claude-toolkit/ or from project root (with claude-toolkit as first arg or .).
set -euo pipefail

TOOLKIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" && pwd)"
# Project root: use PROJECT_ROOT if set; otherwise parent of toolkit dir (e.g. when run as ./claude-toolkit/install.sh from project root)
if [[ -n "${PROJECT_ROOT:-}" ]]; then
  PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
else
  PROJECT_ROOT="$(cd "$(dirname "$TOOLKIT_DIR")" && pwd)"
fi

echo "Toolkit: $TOOLKIT_DIR"
echo "Project root: $PROJECT_ROOT"

mkdir -p "$PROJECT_ROOT/.claude/rules"
mkdir -p "$PROJECT_ROOT/.claude/skills"
mkdir -p "$PROJECT_ROOT/docs"

# CLAUDE.md (skip if installing into the toolkit dir itself)
if [[ "$PROJECT_ROOT" != "$TOOLKIT_DIR" ]]; then
  if [[ -f "$PROJECT_ROOT/CLAUDE.md" ]]; then
    cp "$PROJECT_ROOT/CLAUDE.md" "$PROJECT_ROOT/CLAUDE.md.bak"
    echo "Backed up existing CLAUDE.md to CLAUDE.md.bak"
  fi
  cp "$TOOLKIT_DIR/CLAUDE.md" "$PROJECT_ROOT/CLAUDE.md"
  echo "Installed CLAUDE.md"
else
  echo "Project root is toolkit dir; CLAUDE.md left as-is"
fi

# Rules
cp -r "$TOOLKIT_DIR"/rules/* "$PROJECT_ROOT/.claude/rules/"
echo "Installed .claude/rules/"

# Skills (toolkit has skills/*.md, we copy into .claude/skills/)
for skill in "$TOOLKIT_DIR"/skills/*.md; do
  [[ -f "$skill" ]] || continue
  name="$(basename "$skill" .md)"
  cp "$skill" "$PROJECT_ROOT/.claude/skills/$name.md"
done
echo "Installed .claude/skills/"

# PROJECT_MEMORY.md template (only if missing)
if [[ ! -f "$PROJECT_ROOT/docs/PROJECT_MEMORY.md" ]]; then
  cp "$TOOLKIT_DIR/templates/PROJECT_MEMORY.md" "$PROJECT_ROOT/docs/PROJECT_MEMORY.md"
  echo "Created docs/PROJECT_MEMORY.md from template"
else
  echo "docs/PROJECT_MEMORY.md already exists; not overwriting"
fi

# AGENT_TOOLS.md (only if missing)
if [[ ! -f "$PROJECT_ROOT/docs/AGENT_TOOLS.md" ]]; then
  cp "$TOOLKIT_DIR/docs/AGENT_TOOLS.md" "$PROJECT_ROOT/docs/AGENT_TOOLS.md"
  echo "Created docs/AGENT_TOOLS.md"
else
  echo "docs/AGENT_TOOLS.md already exists; not overwriting"
fi

echo "Done. Read this toolkit's README.md for usage and customization."
