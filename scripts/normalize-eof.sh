#!/bin/bash
# Normalize end-of-file newlines for all text files
# This ensures all files end with a newline character as per .editorconfig

set -e

echo "Normalizing end-of-file newlines..."

# Find all text files and ensure they end with a newline
# Exclude node_modules, .git, and other build artifacts
find . \
  -type f \
  \( \
    -name "*.ts" -o \
    -name "*.tsx" -o \
    -name "*.js" -o \
    -name "*.jsx" -o \
    -name "*.json" -o \
    -name "*.md" -o \
    -name "*.sql" -o \
    -name "*.sh" -o \
    -name "*.css" -o \
    -name "*.html" -o \
    -name "*.yml" -o \
    -name "*.yaml" -o \
    -name "*.toml" -o \
    -name "*.txt" -o \
    -name ".editorconfig" -o \
    -name ".gitattributes" \
  \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  ! -path "*/.next/*" \
  ! -path "*/dist/*" \
  ! -path "*/build/*" | while read -r file; do
  # Check if file exists and is not empty
  if [ -f "$file" ] && [ -s "$file" ]; then
    # Check if file doesn't end with newline (tail -c 1 returns last byte, if it's not newline, wc -l will be 0)
    if ! [ -z "$(tail -c 1 "$file" 2>/dev/null | od -An -tx1 | grep -q 0a && echo yes)" ]; then
      # File doesn't end with newline, add one
      if [ "$(tail -c 1 "$file" 2>/dev/null | od -An -tx1)" != " 0a" ]; then
        echo "Adding newline to: $file"
        printf '\n' >> "$file"
      fi
    fi
  fi
done

echo "Done normalizing end-of-file newlines."


