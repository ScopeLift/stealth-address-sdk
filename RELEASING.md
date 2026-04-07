# RELEASING.md

## Release Checklist

1. Decide whether a release is needed.
2. Choose the next version: `patch`, `minor`, `major`, or next `beta`.
3. Update [package.json](package.json).
4. Update [CHANGELOG.md](CHANGELOG.md).
5. Run:
   - `bun run check`
   - `bun run build`
   - `bun test`
6. Publish from the intended commit:
   - stable: `bun run publish`
   - beta: `bun run build && npm publish --tag beta`
7. Create and push a tag like `v1.0.1` or `v1.0.0-beta.3`.

## Notes

- Release intent is maintainer-decided.
- Stable releases should publish to the `latest` dist-tag.
- Prereleases should publish to the `beta` dist-tag.
