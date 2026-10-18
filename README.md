# Mitra

**Mitra** is a Windows-first, USB-carried personal AI assistant in early development. It is desktop software, not a website.

## Status

**Prototype foundation — not ready for sensitive or everyday use.** This first version is only a console entry point. Authentication, encrypted storage, USB-presence checks, AI, voice, and computer control are not implemented yet.

## Requirements

- Windows PCs first.
- Mostly offline, with optional cloud AI only when explicitly approved.
- Owner and separately authorized users.
- Private memory and secrets must stay out of source control.
- Removable-drive operation where practical.
- Confirm consequential actions; never execute arbitrary model-generated commands.

## Development

Install Python 3.11 or newer, then run `python -m mitra` from the repository root. This is not yet a packaged Windows application.

## Security

This repository is public. Never commit passwords, API keys, tokens, private memory, patient information, or encryption keys. A USB drive alone does not prove identity. Removing a drive cannot guarantee all traces disappear from host memory, caches, logs, or temporary files. Cloud AI may receive any content sent to it. Do not use this prototype for confidential or patient-identifiable data.

## Roadmap

1. Minimal runnable app and tests.
2. Authentication and threat model.
3. Encrypted USB-resident data.
4. Locking on drive removal.
5. Permission-gated tools and audit events.
6. Optional local AI; explicitly approved cloud AI.
7. Voice interaction.
8. Windows packaging and USB testing.

No license has been selected. Until one is added, do not assume reuse or redistribution is permitted.
