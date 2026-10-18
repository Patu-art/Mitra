# Mitra

Mitra is a personal AI assistant project intended to grow into a companion for Windows and Android. This repository now contains an early, responsive browser-based chat prototype.

## Current status

**Early prototype — not secure or feature-complete.** The browser interface can call Google's Gemini API when a user supplies their own API key in the settings dialog. It is not a standalone AI model, and it has not been verified with a real API key in this environment.

Implemented in this prototype:
- Responsive chat interface for desktop and mobile browsers.
- Gemini API connection configured by the user.
- API key held in JavaScript memory for the current tab; it is not committed to this repository or saved by the app.
- Conversation history stored in the current browser's local storage.
- New-conversation control and clear connection/error feedback.

Not implemented yet:
- Native Android or Windows apps.
- Secure shared memory or cross-device synchronization.
- Encrypted USB storage, USB-presence authentication, or removal locking.
- Voice, device control, offline AI, user accounts, or a private backend.
- A server-side proxy to keep provider credentials away from browser requests.

## Try the browser prototype

1. Open the deployed GitHub Pages site if Pages is enabled for this repository. If it is not deployed yet, enable Pages in the repository settings and publish from the main branch / root folder.
2. Create a Gemini API key through [Google AI Studio](https://aistudio.google.com/app/apikey), subject to Google's current eligibility and usage limits.
3. Open Connect AI in Mitra and paste the key. The app keeps it in memory for the current tab only. Refreshing or closing the tab clears it.
4. Send a simple, non-sensitive test message.

This browser-only implementation sends prompts to Google's API directly from the browser. It is a learning prototype, not a secure production architecture. Never use it on a shared/untrusted device, never commit API keys, and do not send passwords, confidential information, or patient-identifiable data. Provider terms and free-tier availability can change.

## Local data

Conversation history is stored in the browser's local storage on that device. It is not automatically shared between phone and PC. Do not use this prototype to store sensitive conversations. Clearing browser site data removes the saved history.

## Roadmap

1. Test and stabilize the browser chat.
2. Add user-controlled export/import for non-sensitive conversation data.
3. Design secure identity, encrypted storage, and a realistic USB workflow.
4. Evaluate an optional private backend or local model if needed.
5. Add voice and carefully permission-gated device actions.
6. Explore native Windows and Android packages.

A USB drive is storage, not an authentication factor by itself. Removing a drive cannot guarantee all traces disappear from host memory, caches, logs, or temporary files.

## Development notes

The older Python console scaffold remains in the repository as an initial experiment. The browser prototype is currently the simplest way to test one interface on both a Windows PC and Android phone.

No license has been selected. Until one is added, do not assume reuse or redistribution is permitted.
