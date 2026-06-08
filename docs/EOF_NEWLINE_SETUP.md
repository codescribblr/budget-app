# End-of-File Newline Setup

This project ensures all text files end with a newline character, as per POSIX standards and `.editorconfig` settings.

## Configuration

### `.editorconfig`
The `.editorconfig` file is configured with `insert_final_newline = true` to ensure editors automatically add newlines.

### `.gitattributes`
The `.gitattributes` file ensures consistent line endings (LF) across all platforms.

## Normalizing Existing Files

To normalize all existing files in the repository:

```bash
npm run normalize-eof
```

Or directly:

```bash
./scripts/normalize-eof.sh
```

## Automatic Enforcement

### Pre-commit Hook (Recommended)

A pre-commit hook is automatically installed that ensures all staged files end with a newline before committing:

```bash
# The hook is automatically copied to .git/hooks/pre-commit
# It runs automatically on every commit
```

The hook will:
1. Check all staged text files
2. Add a newline if missing
3. Re-stage the modified files
4. Allow the commit to proceed

### Manual Setup

If you need to manually set up the hook:

```bash
cp scripts/pre-commit-eof.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Editor Configuration

Most modern editors respect `.editorconfig` and will automatically:
- Insert final newlines when saving files
- Use LF line endings
- Trim trailing whitespace

### VS Code
VS Code automatically respects `.editorconfig`. You can also add to your settings:

```json
{
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
```

### Other Editors
Check your editor's documentation for `.editorconfig` support or manual configuration.

## Troubleshooting

If files still show up as changed when you open them:

1. Run the normalization script: `npm run normalize-eof`
2. Commit the changes: `git add -A && git commit -m "Normalize EOF newlines"`
3. Ensure your editor respects `.editorconfig`
4. Check that the pre-commit hook is installed: `ls -la .git/hooks/pre-commit`

