#!/bin/bash
# Pre-commit hook to ensure all staged files end with a newline
# This prevents files from being committed without final newlines

# Get list of staged files
staged_files=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$staged_files" ]; then
  exit 0
fi

# Track if we need to re-stage any files
needs_restage=false

for file in $staged_files; do
  # Skip if file doesn't exist or is binary
  if [ ! -f "$file" ] || git check-attr --all "$file" | grep -q "binary: set"; then
    continue
  fi
  
  # Check if file is a text file we care about
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.json|*.md|*.sql|*.sh|*.css|*.html|*.yml|*.yaml|*.toml|*.txt|.editorconfig|.gitattributes)
      # Check if file doesn't end with newline
      if [ -s "$file" ] && [ "$(tail -c 1 "$file" | wc -l)" -eq 0 ]; then
        echo "Adding newline to: $file"
        echo "" >> "$file"
        git add "$file"
        needs_restage=true
      fi
      ;;
  esac
done

if [ "$needs_restage" = true ]; then
  echo "Some files were modified to add final newlines. Please review and commit again."
fi

exit 0


