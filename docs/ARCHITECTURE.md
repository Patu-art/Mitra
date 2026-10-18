# Mitra architecture — initial draft

## Principles

- Local-first, explicit consent, deny-by-default permissions.
- Keep source code separate from private runtime data.
- Treat all model output as untrusted input.
- Never let the language model directly execute arbitrary shell commands.
- Require explicit confirmation for sending, deleting, purchasing, sharing, or other high-impact actions.

## Proposed components

1. Launcher: starts Mitra from removable storage and verifies expected files.
2. Authentication: verifies a password or cryptographic credential; drive presence alone is insufficient.
3. Private store: encrypted, USB-resident profile, memory, and settings.
4. Permission broker: grants narrowly scoped access to individual tools.
5. AI adapter: local model by default when available; cloud provider disabled unless explicitly enabled.
6. Tool adapters: file operations and Windows automation behind allowlists and confirmations.
7. Audit log: records security-relevant actions without logging secrets or sensitive content.

## USB removal

On loss of the expected volume, Mitra should stop new tool actions, clear in-process secrets where possible, close the private store, and require re-authentication when the drive returns. This reduces risk but cannot guarantee every trace is removed from the host computer.

## Public repository rule

Never commit private user data, secrets, tokens, encryption keys, personal memory, or real patient data. Runtime data must live outside the source tree and be excluded by .gitignore.

## Current implementation

Only a console entry point and a smoke test exist in this first stage. Authentication, encryption, USB monitoring, AI, voice, and computer automation are not implemented yet.
