# Compose Announcement History And Watch Example

This example shows the recommended `scan -> watch` composition for a user inbox:

- keep a merged inbox in memory for the current page session
- catch up paged history with `getAnnouncementsPageUsingSubgraph(...)`
- filter each page locally with `getAnnouncementsForUser(...)`
- only start `watchAnnouncementsForUser(...)` after catch-up completes
- start live watching from `snapshotBlock + 1n`

Run it with:

```bash
bun install
bun run dev
```
