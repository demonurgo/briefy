#!/usr/bin/env bash
# (c) 2026 Briefy contributors — AGPL-3.0
# Idempotent AGPL-3.0 header injector (bash variant).
# Usage: bash scripts/add-agpl-header.sh
# Adds a single-line header immediately after the PHP opener (<?php) for PHP files,
# or at the top of the file for TS/TSX files. Re-running is safe; already-headered files are skipped.
#
# Windows users without git-bash/WSL: use scripts/add-agpl-header.ps1 instead.

set -euo pipefail

# Shell-environment guard: bail with a helpful message if POSIX tools are missing.
command -v grep >/dev/null 2>&1 || { echo "ERROR: grep not found. Requires git-bash/WSL on Windows, or a POSIX shell on macOS/Linux. On native Windows PowerShell, run scripts/add-agpl-header.ps1 instead." >&2; exit 1; }
command -v find >/dev/null 2>&1 || { echo "ERROR: find not found. Requires git-bash/WSL on Windows, or a POSIX shell on macOS/Linux. On native Windows PowerShell, run scripts/add-agpl-header.ps1 instead." >&2; exit 1; }

HEADER_TEXT="// (c) 2026 Briefy contributors — AGPL-3.0"
MARKER="Briefy contributors"

php_files=$(find app database/migrations config -type f -name "*.php" 2>/dev/null || true)
ts_files=$(find resources/js -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null || true)

added=0
skipped=0

inject_php() {
  local f="$1"
  if grep -q "$MARKER" "$f"; then
    skipped=$((skipped+1))
    return
  fi
  # Insert header on line 2 (right after <?php on line 1).
  if head -1 "$f" | grep -q '^<?php'; then
    { head -1 "$f"; echo "$HEADER_TEXT"; tail -n +2 "$f"; } > "$f.agpl.tmp" && mv "$f.agpl.tmp" "$f"
    added=$((added+1))
  else
    echo "skip (no <?php opener): $f" >&2
    skipped=$((skipped+1))
  fi
}

inject_ts() {
  local f="$1"
  if grep -q "$MARKER" "$f"; then
    skipped=$((skipped+1))
    return
  fi
  { echo "$HEADER_TEXT"; cat "$f"; } > "$f.agpl.tmp" && mv "$f.agpl.tmp" "$f"
  added=$((added+1))
}

for f in $php_files; do inject_php "$f"; done
for f in $ts_files; do inject_ts "$f"; done

echo "AGPL header injection complete. Added: $added. Skipped (already headered or non-standard): $skipped."

# CI-friendly verification: exit non-zero if any target file still lacks the header.
missing=$(grep -L "$MARKER" $php_files $ts_files 2>/dev/null | grep -v '^$' || true)
if [ -n "$missing" ]; then
  echo "FAIL: the following files are missing the AGPL header:" >&2
  echo "$missing" >&2
  exit 1
fi
