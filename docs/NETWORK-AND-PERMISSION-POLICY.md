# Mitra network and action policy

**Default network state: OFF.** This is a product requirement, not merely a UI preference.

## Network access

1. A fresh installation starts with network access disabled for Mitra's AI and search features.
2. When disabled, the app must not call remote model providers, web search, analytics endpoints, or remote memory services.
3. If a request requires online information while network access is disabled, Mitra explains that limitation and asks whether the user wants to enable network access.
4. Enabling network access is an explicit user action. It does not automatically authorize every provider, integration, or data category.
5. Even while enabled, Mitra only uses online services when the user's request or a separately configured automation requires them.
6. Before sending conversation content or personal data to a remote provider, the app must disclose what will be sent and obtain the required user consent.
7. There is no silent cloud fallback when local processing fails.
8. The user can disable network access at any time. New remote requests must stop; in-flight requests should be cancelled where technically possible.

## Capability execution

1. A model-generated capability request is an untrusted proposal, not an executable command.
2. The policy layer checks the capability allowlist, argument schema, user setting, current OS permission, and action risk.
3. Unknown capabilities and malformed arguments are rejected.
4. High-impact actions require a clear confirmation immediately before execution.
5. A platform adapter must return a structured result. Mitra must not announce success before receiving a successful result.
6. Permission denial, unsupported operations, and platform errors must be explained without attempting a bypass.

## Data boundaries

- Local memory stays on the device unless the user explicitly chooses an export or sync feature.
- Secrets and private memory must never be written to source control or ordinary diagnostic logs.
- Third-party app data is accessible only through documented, user-authorized interfaces.
- No reading private app databases, bypassing Android/iOS sandboxing, or scraping protected app storage.

## Initial action risk levels

| Risk | Examples | Required handling |
|---|---|---|
| Low | Start timer, open an app | Validate request and required OS permission |
| Moderate | Read calendar, read permitted notifications | Explicit capability permission and clear user settings |
| High | Send a message, delete data, publish content, purchase/pay, change security settings | Show exact action and ask for confirmation immediately before execution |

This policy must be enforced by trusted application code, not by a prompt or model instruction alone.
