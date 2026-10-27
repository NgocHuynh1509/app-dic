# Particle DIC unlock implementation plan

**Goal:** Require a separate key once per machine while preserving every existing tab and DIC control.

**Architecture:** Keep application licensing unchanged. Electron validates a dedicated key hash and persists the key using OS encryption. A React gate mounts the unchanged ParticleDIC component only after activation. DIC HTTP/WebSocket authentication also checks the feature entitlement.

**Tech stack:** Existing Electron, React, Node crypto and node:test; no new dependencies.

**Constraints:** Preserve existing uncommitted changes, UI, tab retention, global license and serial functionality. No expiry on the feature key. Browser-only development shows the locked screen because OS storage is desktop-only.

**Approaches:** A UI-only localStorage flag is easy to bypass. Reusing the global license cannot independently lock DIC. Use a separate Electron key and OS-encrypted persisted record.

**Review focus:** Wrong/empty keys; restart persistence; unreadable or corrupt storage; write/encryption failures; requests while feature/global license is locked.

- [x] Add failing behavioral tests for activation, persistence and server authorization.
- [x] Add key hash configuration, OS-encrypted persistence and restricted IPC handlers.
- [x] Wrap only ParticleDIC with an isolated unlock screen; preserve existing component and layout.
- [x] Run Node tests, build, lint and DIC self-test where dependencies permit; document key delivery and verification limitations.

Execution: inline in the existing checkout, preserving the user's current edits. The user confirmed one-time remembered activation and preservation of all UI features.

Verification: six Node behavioral tests passed after failing before implementation. TypeScript + Vite production build passed. Existing DIC synthetic-image self-test passed. Lint has warnings in existing unrelated components; no errors. Native process sandbox restrictions required rerunning npm install/build with elevated tool permission. No application license data or user activation was modified during testing. Camera hardware, interactive desktop UI and actual DPAPI persistence were not exercised; encryption tests use AES-GCM storage with the same interface.
