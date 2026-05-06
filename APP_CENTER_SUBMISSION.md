# Apps Center Resubmission Draft

## Short Pitch

OpenClaw Pet is a Telegram-first OpenClaw and Hermes agent companion. Users manage their agent loop from Telegram, sync real OpenClaw activity into memory, and keep progress visible through a living pet dashboard.

## What Changed Since Decline

- Stronger mobile UI with a clear pet habitat, Hermes Console, stats, quests, badges, and social actions.
- The core value is Telegram control for Hermes and OpenClaw memory sync, not a storefront loop.
- Progress syncs server-side through OpenClaw memory files on the deploy host.
- A daily OpenClaw Sync action reads recent local OpenClaw activity metadata and turns it into pet XP.
- Guest web fallback works in Claude, Codex, and normal browsers without claiming non-Telegram native support.
- WhatsApp is implemented only as a share link back to the Telegram Mini App.
- Support and privacy surfaces are available through app links and bot commands.

## Review Notes

- Primary platform: Telegram Mini App.
- Monetization: none in v1.
- Stored data: Telegram user id, pet progress, badges, and OpenClaw activity metadata in OpenClaw memory.
- No external database is required for v1.

## Requested Listing Copy

Telegram-first OpenClaw/Hermes agent companion with synced memory, daily quests, social sharing, and a living agent pet dashboard.
