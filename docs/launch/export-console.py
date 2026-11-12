#!/usr/bin/env python3
"""Export source for a new owner-designated repository without runtime credentials.

Refuse a nonempty destination so earlier owner work is never replaced. Generated
build artifacts are intentionally excluded; rebuild from the committed lockfile.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import shutil
from pathlib import Path

EXCLUDED_DIRS = {'.git', 'node_modules', '.manus-logs', '.cache', 'dist', 'dist-pages', 'coverage', '__pycache__'}
EXCLUDED_FILES = {'.project-config.json', 'template.json', 'vite.config.ts.bak'}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    source = args.source.resolve()
    destination = args.destination.resolve()
    if not source.is_dir():
        parser.error('Source must be an existing app directory.')
    if destination == source or source in destination.parents:
        parser.error('Destination must be outside source.')
    if destination.exists() and any(destination.iterdir()):
        parser.error('Destination is nonempty; choose a new export path.')
    destination.mkdir(parents=True, exist_ok=True)
    records = []
    for path in sorted(source.rglob('*')):
        relative = path.relative_to(source)
        if any(part in EXCLUDED_DIRS for part in relative.parts):
            continue
        if path.name in EXCLUDED_FILES or path.name.startswith('.env'):
            continue
        # The runtime debug collector and managed project version metadata are
        # not part of the distributable source product.
        if '__manus__' in relative.parts:
            continue
        if path.is_symlink():
            continue
        if not path.is_file():
            continue
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        records.append({'path': relative.as_posix(), 'bytes': target.stat().st_size,
                        'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    manifest = {'source_product': 'global-fusion-console', 'exclusions': sorted(EXCLUDED_DIRS | EXCLUDED_FILES),
                'runtime_credentials_included': False, 'files': records}
    (destination / 'source-export-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'destination': str(destination), 'file_count': len(records),
                      'manifest': str(destination / 'source-export-manifest.json')}, indent=2))


if __name__ == '__main__':
    main()
