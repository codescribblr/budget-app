#!/usr/bin/env python3
"""Create a portable artifact from prepared standalone output, with no secrets.
Symlinks are dereferenced only within the prepared root; archive paths are flat
relative names and contain regular files/directories, never links or devices.
"""
import gzip
import os
from pathlib import Path
import sys
import tarfile

def package(source, target):
    root = Path(source).resolve(strict=True)
    target = Path(target).absolute()
    if target.is_relative_to(root):
        raise ValueError('Place the archive outside its source directory')
    total = 0
    count = 0
    visited = set()
    def visit(path, relative, archive):
        nonlocal total, count
        if any(part == '.git' or part.startswith('.env') for part in relative.parts) or relative.parts[:2] == ('.next', 'cache'):
            return
        resolved = path.resolve(strict=True)
        if not resolved.is_relative_to(root):
            raise ValueError('Artifact link leaves prepared root')
        if resolved in visited:
            raise ValueError('Artifact directory link cycle')
        if resolved.is_dir():
            visited.add(resolved)
            info = tarfile.TarInfo(relative.as_posix()); info.type = tarfile.DIRTYPE; info.mode = 0o755
            archive.addfile(info)
            for child in sorted(resolved.iterdir()):
                visit(child, relative / child.name, archive)
            visited.remove(resolved)
        elif resolved.is_file():
            info = tarfile.TarInfo(relative.as_posix()); info.size = resolved.stat().st_size
            info.mode = 0o755 if resolved.stat().st_mode & 0o111 else 0o644
            total += info.size; count += 1
            if total > 1 << 30 or count > 100000:
                raise ValueError('Expanded artifact exceeds agent limits')
            with resolved.open('rb') as content:
                archive.addfile(info, content)
        else:
            raise ValueError('Only regular files and directories are allowed')
    try:
        with target.open('xb') as output:
            os.chmod(target, 0o600)
            with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
                with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as archive:
                    for child in sorted(root.iterdir()):
                        visit(child, Path(child.name), archive)
            output.flush(); os.fsync(output.fileno())
        if target.stat().st_size > 512 << 20:
            raise ValueError('Compressed artifact exceeds 512 MiB')
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    return count, total
if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: package-release.py PREPARED_DIRECTORY OUTPUT.tar.gz')
    count, size = package(*sys.argv[1:])
    print(f'Packaged {count} regular files ({size} expanded bytes).')
