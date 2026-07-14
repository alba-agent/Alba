#!/bin/bash
# install-skills.sh — Installs ALBA's built-in skills
# Usage: bash scripts/install-skills.sh

set -e

SKILLS_DIR="$(cd "$(dirname "$0")/.." && pwd)/skills"
mkdir -p "$SKILLS_DIR"

echo "Installing ALBA skills..."

# Clone only the SKILL.md files from each skill repo
install_skill() {
  local name="$1"
  local url="$2"
  local dir="$SKILLS_DIR/$name"
  
  if [ -d "$dir" ]; then
    echo "  ✓ $name already installed"
    return
  fi
  
  echo "  Installing $name..."
  git clone --depth 1 --filter=blob:none --sparse "$url" "$dir" 2>/dev/null || {
    # Fallback: full clone then clean up
    git clone --depth 1 "$url" "$dir" 2>/dev/null || {
      echo "  ✗ Failed to install $name"
      return
    }
  }
  echo "  ✓ $name installed"
}

install_skill "claude-mem" "https://github.com/thedotmack/claude-mem.git"
install_skill "ui-ux-pro-max-skill" "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git"
install_skill "taste-skill" "https://github.com/Leonxlnx/taste-skill.git"
install_skill "impeccable" "https://github.com/pbakaus/impeccable.git"
install_skill "design-motion-principles" "https://github.com/kylezantos/design-motion-principles.git"

echo ""
echo "Skills installed to: $SKILLS_DIR"
echo "To use: Skills are loaded by the agent at startup from ~/.mio/skills/"
