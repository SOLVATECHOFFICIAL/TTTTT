# WhatsApp Connection Stability, Group Sync & Command Execution Plan

## Application Overview
This plan resolves the root causes preventing your WhatsApp bot from replying to commands and loading groups, while completely removing all Render and Railway dependencies so the application runs exclusively on Google AI Studio.

### Root Causes Identified
1. **Old Render Deployment Stealing Your WhatsApp Connection**:
   - Outgoing messages had link-preview scraping enabled (`getUrlInfo`) and pointed to your old Render URL. Every time the bot tried to send a message containing that link, it pinged the sleeping Render server, waking it up.
   - Once awake, the old Render server loaded your session credentials from the shared `column` database collection and connected to WhatsApp, immediately kicking Google AI Studio off with `Connection Closed` (`440: connectionReplaced`) and `Precondition Required` (`428`).
2. **Overlapping Socket Restarts During Handshake**:
   - On server startup and license sync, multiple background routines (`autoRestoreAllSessions`, `setSessionLicense`, `/api/groups`, and the 1-minute health check) simultaneously called socket initialization while a socket was already mid-handshake, closing the active WebSocket before it could finish connecting.
3. **Group Fetching Timeouts & Avatar Bottlenecks**:
   - Fetching participating groups waited inline for up to 10 live WhatsApp profile picture queries before returning a response, and threw unhandled `timeout` / `Connection Closed` errors instead of serving a persistent local group cache.
4. **Commands Ignored on Multi-Device LID Messages (`@lid`)**:
   - WhatsApp's latest multi-device protocol delivers many self-chat and group messages under privacy-masked `@lid` identifiers while placing the sender's phone number in `participantAlt` / `remoteJidAlt`, or wraps self-messages inside `deviceSentMessage`. Because the message listener did not unwrap `deviceSentMessage` or read `participantAlt` / `remoteJidAlt`, owner and admin commands were silently ignored.

---

## Architecture & Data Flow

```
+-----------------------------------------------------------------------+
|                        Google AI Studio Server                        |
|                                                                       |
|  +------------------------+       +--------------------------------+  |
|  | Single-Flight Socket   | ----> |Isolated Cloud Session Backup   |  |
|  | Guard (No Overlapping  |       |('studio_sessions' collection)  |  |
|  | Handshake Restarts)    |       |Old Render 'column' cleared     |  |
|  +-----------+------------+       +--------------------------------+  |
|              |                                                        |
|              v                                                        |
|  +------------------------+       +--------------------------------+  |
|  | Baileys v7 Socket      | ----> | Instant Group Cache Engine     |  |
|  | (Link Scraping Off)    |       | - Disk-backed group cache      |  |
|  +-----------+------------+       | - Warm sync on connect         |  |
|              |                    | - Lazy background avatars      |  |
|              v                    +--------------------------------+  |
|  +------------------------+                                           |
|  | Message & Command Flow |                                           |
|  | - Unwrap deviceSentMsg |                                           |
|  | - Map @lid via Alt JID |                                           |
|  | - Safe reply fallback  |                                           |
|  +------------------------+                                           |
+-----------------------------------------------------------------------+
```

---

## Planned Changes

### 1. Isolate Sessions from Render & Remove Render / Railway Completely
- **Migrate Cloud Session Backups to `studio_sessions`**: Move active cloud session backups to a dedicated `studio_sessions` collection and mark the legacy `column` collection records as unlinked so the old Render deployment cannot restore or steal your WhatsApp connection.
- **Disable Outgoing Link-Preview Scraping**: Turn off automatic link-preview HTTP scraping on outgoing messages so sending URLs never stalls message delivery or pings external servers.
- **Purge Render & Railway References**: Remove all Render and Railway URLs, environment checks, deployment guides, and configuration files across the server and frontend, setting the canonical application URL to your Google AI Studio domain.

### 2. Eliminate Socket Handshake Race Conditions
- **Single-Flight Connection Lock**: Check the active initialization lock before running any asynchronous setup, and return the existing socket whenever a connection is already handshaking (`readyState === 0`) or open (`readyState === 1`).
- **Non-Disruptive License & Startup Sync**: Update license synchronization so it only wakes up an idle session when transitioning from expired to valid, and deduplicate startup session restoration so sessions connect cleanly once.

### 3. Instant Group Loading with Disk Cache & Background Avatars
- **Persistent Disk Group Cache**: Persist fetched group metadata and per-group settings locally inside each session folder so the Groups tab loads immediately even during socket reconnections.
- **Pre-Warm Groups on Connect & Lazy-Load Avatars**: Automatically warm the group cache shortly after a session opens, and fetch group profile icons asynchronously in the background instead of blocking the `/api/groups` response.
- **Graceful Timeout Handling**: Return cached groups with a clean HTTP 200 response if WhatsApp temporarily throttles or closes a live group query, eliminating console and UI errors.

### 4. Reliable Command Recognition & Reply Delivery
- **Full Message Unwrapping**: Unwrap `deviceSentMessage`, `editedMessage`, and `protocolMessage.editedMessage` envelopes so commands sent from your own linked devices are always parsed.
- **Baileys v7 `@lid` Phone Resolution**: Extract `participantAlt` and `remoteJidAlt` from incoming message keys to automatically link `@lid` addresses to your phone number and owner/admin permissions.
- **Resilient Command Replies & Owner Access**: Add a fallback retry without message quoting if WhatsApp rejects a quoted reply, deduplicate message IDs so commands never fire twice, and ensure your primary account email is included in the owner configuration.
