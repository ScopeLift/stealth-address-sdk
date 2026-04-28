# Scan Announcements For User Using Subgraph Example

This example streams historical announcement matches from a pinned
`snapshotBlock`.

Use it when you want incremental historical catch-up. Once that catch-up is
complete, start `watchAnnouncementsForUser(...)` from `snapshotBlock + 1n` for
live delivery.
