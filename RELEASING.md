# RELEASING.md

## Release Flow

1. Create a release branch from `main`, for example `release/1.0.0-beta.3`.
2. Update `package.json` and `CHANGELOG.md`.
3. Run validation locally:
   - `bun run build`
   - `bun test`
   - `npm pack --dry-run`
4. Open a PR to `main` and wait for CI to pass.
5. Merge the PR.
6. Publish by pushing a matching tag, for example `v1.0.0-beta.3`.

## Publishing

- Publishing is handled by GitHub Actions via `.github/workflows/publish.yml`.
- npm publishing uses trusted publishing with GitHub OIDC; no long-lived npm token or PAT is required.
- The publish job runs in the `npm-release` GitHub environment.
- Release tags publish to npm with the default `latest` dist-tag.

## Commands

```bash
git switch -c release/1.0.0-beta.3
git push -u origin release/1.0.0-beta.3

git tag v1.0.0-beta.3
git push origin v1.0.0-beta.3
```

## Notes

- Keep the git tag and `package.json` version aligned.
- Use `bun run fix` for local Biome autofixes when needed.
- Real subgraph integration tests may depend on external subgraph availability.
