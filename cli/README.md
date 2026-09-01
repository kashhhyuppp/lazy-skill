# lazy-skill

**See it. Search it. Install it.**

Found an AI skill while scrolling? Stop hunting for the repo, the README, and
the install command buried in step four. Search it on Lazy Skill and send it
straight to your computer — from your phone.

## Connect your computer

```bash
npx lazy-skill connect
```

Scan the QR it prints with the Lazy Skill app. That's the whole setup.

```bash
npx lazy-skill listen      # wait for installs sent from your phone
```

## Commands

| Command | What it does |
|---|---|
| `lazy-skill connect` | Pair this computer with the app |
| `lazy-skill listen` | Wait for installs sent from your phone |
| `lazy-skill status` | Show the connection and detected tools |
| `lazy-skill skills` | List skills installed on this computer |
| `lazy-skill install <ref>` | Install a skill locally |
| `lazy-skill theme [id]` | Pick a colour theme |
| `lazy-skill disconnect` | Revoke this computer |

## Supported tools

Claude Code, Codex and Cursor. Detected by looking for them — never assumed.
Anything not found is reported as "Not detected", never as ready.

## What this does and does not do

Installation runs through [`skills`](https://www.npmjs.com/package/skills), the
upstream installer, at a pinned version.

**This is not a remote shell.** The server can queue one of four named
operations with structured parameters; it cannot send a command line, a path,
or a flag. Everything the server sends is re-validated on your machine before
anything runs, against a copy of the rules the CLI carries itself — so a
compromised server still cannot make your computer run something arbitrary.

Your device credential lives in `~/.lazyskill/config.json`, written `0600`.
Pairing codes are single-use and expire in two minutes.

## Requirements

Node.js 18 or newer.

## Licence

MIT
