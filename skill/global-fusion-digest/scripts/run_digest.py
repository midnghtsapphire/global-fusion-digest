#!/usr/bin/env python3
"""Check/install the owner-supplied Global Fusion package and run one local archive."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

PACKAGE = "@midnghtsapphire/global-fusion-digest"
VERSION = "1.0.0"


def integer(minimum, maximum):
    def parse(value):
        if not value.isascii() or not value.isdecimal():
            raise argparse.ArgumentTypeError("use an unsigned decimal integer")
        number = int(value)
        if not minimum <= number <= maximum:
            raise argparse.ArgumentTypeError(f"must be between {minimum} and {maximum}")
        return number
    return parse


def run(command, cwd=None, capture=False):
    result = subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False)
    if result.stderr:
        sys.stderr.write(result.stderr)
    if result.returncode:
        if result.stdout:
            sys.stderr.write(result.stdout)
        raise RuntimeError(f"{Path(command[0]).name} exited {result.returncode}")
    if not capture and result.stdout:
        sys.stderr.write(result.stdout)
    return result.stdout


def package_identity(root):
    manifest = root / "package.json"
    if not manifest.is_file():
        raise RuntimeError(f"package.json not found in {root}")
    data = json.loads(manifest.read_text(encoding="utf-8"))
    if data.get("name") != PACKAGE or data.get("version") != VERSION:
        raise RuntimeError(f"Expected {PACKAGE}@{VERSION}; inspect/review the selected package before running")
    cli = root / "src" / "cli.mjs"
    if not cli.is_file():
        raise RuntimeError(f"CLI missing: {cli}")
    return cli


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--repo", type=Path, help="Existing verified checkout (runs npm ci)")
    source.add_argument("--tarball", type=Path, help="Verified local release npm .tgz (installs locally)")
    parser.add_argument("--install-dir", type=Path, help="Isolated install directory; can reuse a prior install")
    parser.add_argument("--output", type=Path, required=True, help="Archive directory; reuse it for turn continuity")
    parser.add_argument("--limit", type=integer(1, 100), default=12)
    parser.add_argument("--advisory-limit", type=integer(1, 10), default=3)
    parser.add_argument("--seed-last-turn", type=integer(0, 999999998), default=0)
    args = parser.parse_args()
    if args.repo and args.install_dir:
        parser.error("--repo cannot be combined with --install-dir")
    if args.tarball and not args.install_dir:
        parser.error("--tarball requires --install-dir")
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js 22+ is required")
    node_version = run([node, "--version"], capture=True).strip()
    if int(node_version.lstrip("v").split(".")[0]) < 22:
        raise RuntimeError(f"Node.js 22+ is required; found {node_version}")
    npm = shutil.which("npm")
    if args.repo:
        root = args.repo.expanduser().resolve(strict=True)
        cli = package_identity(root)
        if not npm or not (root / "package-lock.json").is_file():
            raise RuntimeError("npm and the checkout package-lock.json are required for npm ci")
        run([npm, "ci", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=root)
        command = [node, str(cli)]
    elif args.install_dir:
        install_dir = args.install_dir.expanduser().resolve()
        if args.tarball:
            tarball = args.tarball.expanduser().resolve(strict=True)
            if not tarball.is_file() or not str(tarball).endswith(".tgz"):
                raise RuntimeError("Select a local npm release .tgz file")
            if not npm:
                raise RuntimeError("npm is required to install a release tarball")
            install_dir.mkdir(parents=True, exist_ok=True)
            run([npm, "install", "--prefix", str(install_dir), "--ignore-scripts", "--no-audit", "--no-fund", str(tarball)])
        root = install_dir / "node_modules" / "@midnghtsapphire" / "global-fusion-digest"
        command = [node, str(package_identity(root))]
    else:
        executable = shutil.which("global-fusion")
        if not executable:
            raise RuntimeError("global-fusion not installed; provide --repo or --tarball with --install-dir")
        installed_version = run([executable, "--version"], capture=True).strip()
        if VERSION not in installed_version.split():
            raise RuntimeError(f"Expected global-fusion {VERSION}; found {installed_version!r}")
        command = [executable]
    output = args.output.expanduser().resolve()
    # The engine owns archive validation/atomic completion; never pre-increment its state here.
    stdout = run(command + ["run", "--output", str(output), "--limit", str(args.limit),
                            "--advisory-limit", str(args.advisory_limit),
                            "--seed-last-turn", str(args.seed_last_turn)], capture=True)
    receipt = json.loads(stdout)
    if type(receipt.get("turn")) is not int or receipt["turn"] < 1:
        raise RuntimeError("CLI did not return a completed turn")
    digest = Path(receipt["digest_path"]).resolve(strict=True)
    if not digest.is_dir() or not digest.is_relative_to(output):
        raise RuntimeError("Receipt digest directory is outside archive or missing")
    for key in ("report_path", "analysis_path", "social_path", "manifest_path"):
        artifact = Path(receipt[key]).resolve(strict=True)
        if not artifact.is_file() or not artifact.is_relative_to(digest):
            raise RuntimeError(f"Receipt artifact outside archive or missing: {key}")
    manifest = json.loads(Path(receipt["manifest_path"]).read_text(encoding="utf-8"))
    if manifest.get("turn") != receipt["turn"] or manifest.get("transaction_state") != "committed":
        raise RuntimeError("Manifest is not committed for the returned turn")
    for item in manifest["files"]:
        artifact = (digest / item["path"]).resolve(strict=True)
        if not artifact.is_file() or not artifact.is_relative_to(digest):
            raise RuntimeError("Manifest path escapes digest")
        data = artifact.read_bytes()
        if len(data) != item["bytes"] or hashlib.sha256(data).hexdigest() != item["sha256"]:
            raise RuntimeError(f"Manifest integrity check failed: {item['path']}")
    sys.stdout.write(json.dumps(receipt, indent=2) + "\n")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        sys.stderr.write(f"Global Fusion wrapper: {error}\n")
        sys.exit(1)
