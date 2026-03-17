#!/usr/bin/env bash
# Setup Claude skills for Salesforce development.
# Run from project root: ./sfclaudeskills/setup.sh
# Or from toolkit dir to install into parent: ./setup.sh
# To install into current dir: PROJECT_ROOT="$(pwd)" ./setup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" && pwd)"
exec "$SCRIPT_DIR/install.sh"
