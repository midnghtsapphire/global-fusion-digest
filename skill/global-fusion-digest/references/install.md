# Installation and execution

Require Python 3 for the wrapper and Node.js 22 or newer with npm for the engine. Verify an owner-supplied release/tag and checksum before installing. The package identity is `@midnghtsapphire/global-fusion-digest` version `1.0.0`; this identity does not prove that it has been published to the npm registry.

From an existing checkout:

```bash
python3 /home/ubuntu/skills/global-fusion-digest/scripts/run_digest.py \
  --repo /absolute/path/to/global-fusion-digest \
  --output /absolute/path/to/archive --limit 12 --advisory-limit 3
```

The wrapper validates the checkout identity, uses `npm ci --ignore-scripts` in that checkout, and invokes `node src/cli.mjs run`. It never runs a shell assembled from inputs.

From a downloaded release npm tarball:

```bash
python3 /home/ubuntu/skills/global-fusion-digest/scripts/run_digest.py \
  --tarball /absolute/path/to/midnghtsapphire-global-fusion-digest-1.0.0.tgz \
  --install-dir /absolute/path/to/isolated-install \
  --output /absolute/path/to/archive
```

The wrapper installs locally with `npm install --prefix` and checks the installed package identity. It does not download an unspecified latest registry package. Once installed, omit `--tarball` and retain `--install-dir` to reuse that installation. Without those arguments it checks an already installed `global-fusion` executable on PATH, including its version, before running it. Installation lifecycle scripts remain disabled; no global npm configuration is changed.

Set `--seed-last-turn 2` only when the owner has verified TURN #002's complete archive and the destination has no prior state. Otherwise omit it. Reuse the same archive directory to continue its local state. A fresh CI workspace has no persistent turn history unless the archive is restored explicitly.

Direct CLI alternatives:

```bash
node src/cli.mjs analyze --limit 12 --advisory-limit 3
node src/cli.mjs run --output ./archive --limit 12 --advisory-limit 3 --seed-last-turn 0
node src/cli.mjs serve
node src/cli.mjs mcp
```

The REST server defaults to `127.0.0.1:8787`; use `FUSION_API_TOKEN` when authentication is required. MCP uses standard input/output. Neither interface grants permission to publish to social networks. Consult the checkout's `docs/api.md` for its actual endpoint/tool contract before invoking it.
