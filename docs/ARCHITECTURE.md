# Mitra — Product and Technical Architecture

**Status:** Architecture baseline (Stage 0)  
**Product direction:** Offline-first, conversational personal AI with permission-gated device actions.  
**First implementation target:** Android. The core must remain portable to other platforms.

## 1. Product definition

Mitra is a personal AI assistant that can:
- hold natural conversations and handle follow-up instructions;
- work offline for supported conversations, memory, and device tasks;
- operate supported device features and apps through explicit platform permissions;
- use the internet only when the user has enabled network access and the task calls for it;
- explain when a request cannot be completed locally or is blocked by platform restrictions.

Mitra is not designed to have unrestricted control over a device. It must use documented operating-system APIs, user-granted permissions, and safe integrations.

## 2. Non-negotiable principles

1. **Offline by default:** Network access is disabled unless the user enables it. No silent cloud fallback.
2. **User control:** Permissions are visible, revocable, and scoped to a capability.
3. **Least privilege:** Request only the permission needed for the current feature.
4. **Safe execution:** The model proposes actions; a trusted action layer validates and executes them.
5. **Confirmation:** Ask before sending messages, deleting data, making purchases/payments, publishing content, changing security settings, or performing other consequential actions.
6. **Honest status:** Never claim an action succeeded until the platform confirms it.
7. **Privacy:** Keep private memory and credentials out of source control. Encrypt sensitive local data.
8. **Portable core:** Keep conversation logic and tool contracts independent of Android, Windows, iOS, or desktop UI frameworks.
9. **Small, testable steps:** Build vertical slices, test them, and avoid speculative infrastructure.

## 3. High-level architecture

```text
                 MITRA CLIENTS
       Android (first) | Windows | iOS | Web
                       |
              Platform Connectors
       permissions | apps | notifications
        calendar | alarms | audio | files
                       |
                 MITRA CORE
       conversation | intent | planning
       policy | memory | tool orchestration
                       |
                 CAPABILITY API
          typed requests and typed results
                       |
              EXECUTION / POLICY LAYER
       allowlists | permission checks | approvals
                       |
              LOCAL CAPABILITIES
       device APIs | local models | local storage
                       |
              OPTIONAL NETWORK GATE
       explicit user setting + per-task intent
                       |
          remote AI / web search / services
```

The diagram describes logical boundaries, not a requirement to deploy separate servers or processes. Keep the first implementation simple.

## 4. Core modules

### 4.1 Conversation and orchestration
- Maintain conversation state and follow-up context.
- Convert requests into structured intents and proposed tool calls.
- Handle uncertainty by asking a focused clarification.
- Keep the language/model provider replaceable.

### 4.2 Policy and permissions
- Decide whether a proposed capability is allowed.
- Check user settings, OS permission state, and action risk.
- Block unknown tools and malformed arguments.
- Require confirmation for high-impact actions.
- Record security-relevant outcomes without storing secrets.

### 4.3 Memory
- Store user-approved preferences and conversation data locally.
- Support inspect, edit, export, and delete controls.
- Encrypt sensitive records at rest.
- Do not silently upload or synchronize memory.

### 4.4 Offline intelligence
- Use local intent/rule handling for deterministic commands.
- Evaluate on-device speech recognition, speech synthesis, and a small local language model separately.
- Do not promise that every open-ended question can be answered offline.
- Benchmark supported devices before selecting model size or runtime.

### 4.5 Network gate
- Default state: **OFF**.
- When OFF, network-backed providers and web tools are unavailable.
- When ON, network use is still task-driven: Mitra should not browse unless the user asks or has explicitly configured an allowed automation.
- Clearly indicate when a task requires network access and ask for permission if it is disabled.
- Never silently send private memory or conversation history to a remote provider.

### 4.6 Capability adapters
Capabilities are exposed through typed interfaces, not arbitrary operating-system commands. Initial Android candidates:
- alarms and timers;
- calendar read/create/update, within granted access;
- app launch;
- notification access and supported message actions;
- audio input/output and speech;
- local files, only within user-selected or app-owned locations.

WhatsApp content and actions are subject to Android sandboxing and WhatsApp's supported interfaces. Mitra must not bypass app security or read private app databases.

## 5. Platform strategy

- **Shared core:** Conversation contracts, policy rules, memory interfaces, tool schemas, and tests.
- **Platform-specific connectors:** Android first; later Windows, iOS, macOS, Linux, and web where feasible.
- **Capability parity is not assumed:** Each platform exposes only what its operating system and app integrations permit.
- **Product modes remain open:** The architecture should support personal use now and leave room for managed/company deployments later, without building enterprise administration prematurely.

## 6. Suggested repository boundaries

Introduce folders only when working code needs them. The intended boundaries are:

- `core/` — platform-independent domain contracts and orchestration.
- `platforms/android/` — Android app, services, permissions, and device adapters.
- `platforms/windows/` — future Windows client and adapters.
- `web/` — existing browser prototype, retained as a separate client.
- `local/` — local model and speech runtime integration.
- `docs/` — architecture decisions, setup, permissions, and threat model.
- `tests/` — core tests and platform integration tests.

The existing root-level browser prototype and Python scaffold must not be deleted or moved until their behavior is inspected and a tested replacement exists. Avoid creating empty placeholder directories.

## 7. First delivery sequence

1. **Stage 0 — Baseline:** Confirm repository state, product boundaries, and architecture (this document).
2. **Stage 1 — Core contracts:** Define capability request/result types, permission decisions, network policy, and test cases. No AI provider or device automation yet.
3. **Stage 2 — First Android vertical slice:** A native Android shell with a local command such as setting a timer, permission/status feedback, and tests.
4. **Stage 3 — Voice loop:** Push-to-talk first; then evaluate background wake-word behavior and battery constraints on real devices.
5. **Stage 4 — Offline conversation:** Benchmark local speech and language options against actual device memory, CPU, latency, and battery.
6. **Stage 5 — Memory and more capabilities:** Add encrypted local memory and carefully scoped calendar/notification integrations.
7. **Stage 6 — Optional network:** Add a visible network gate and provider/search adapters only after offline behavior is stable.
8. **Stage 7 — Other platforms:** Add clients and adapters without coupling their code to the shared core.

## 8. Security and reliability requirements

- No API keys, tokens, private memory, or personal data in Git.
- No arbitrary shell execution by model output.
- Validate every tool name and argument against a strict schema.
- Check permission state at execution time, not only when a setting is first enabled.
- Handle denied/revoked permissions, unavailable apps, offline state, timeouts, and partial failures.
- Make actions idempotent where possible and avoid duplicate execution after retries.
- Provide a clear activity/permission history and a way to revoke capabilities.
- Keep logs minimal; redact message contents, credentials, and sensitive personal data.

## 9. Explicit non-goals for the first release

- Universal control of every app.
- Reading private databases of third-party apps.
- Always-on cloud audio streaming.
- Enterprise administration, multi-user hosting, or cloud memory synchronization.
- A large local model guaranteed to run on every phone.
- USB-based portable execution or automatic deletion of all host traces.

These may be revisited only when there is a concrete requirement and a safe, technically supported design.

## 10. Definition of a successful first milestone

The first milestone is successful when the Android app can accept a local command, validate it through the policy layer, execute one supported device action using an official Android interface, report the real result, and pass automated tests — with network access disabled.
