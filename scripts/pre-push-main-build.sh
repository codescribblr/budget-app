#!/bin/bash
# Block updates to main unless the production build succeeds.
# Vercel deploys as soon as main moves, so a failing build has to stop the push.

set -euo pipefail

pushing_main=false
while read -r local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_ref" = "refs/heads/main" ] && [ "$local_sha" != "0000000000000000000000000000000000000000" ]; then
    pushing_main=true
  fi
done

if [ "$pushing_main" != true ]; then
  exit 0
fi

cd "$(git rev-parse --show-toplevel)"

# The build checks the working tree, not just the commit. A dirty tree can hide
# the error that production will hit, or fail for unrelated local work.
dirty=$(git status --porcelain --untracked-files=normal | grep -v -E '(^.. public/version.json$)' || true)
if [ -n "$dirty" ]; then
  echo "Refusing to push main from a dirty worktree."
  echo "The production build has to match the commit that will deploy."
  echo "Commit or stash these changes, or push from a clean checkout of main:"
  echo "$dirty" | head -40
  exit 1
fi

echo "Pushing main. Running the production build first..."
if ! npm run build; then
  echo "Production build failed. main was not pushed."
  exit 1
fi
