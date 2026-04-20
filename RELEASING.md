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
6. Switch to the latest `main` after the merge and pull it locally.
7. Publish by pushing a matching tag from that exact `main` commit, for example `v1.0.0-beta.3`.

## Publishing

- Publishing is handled by GitHub Actions via `.github/workflows/publish.yml`.
- npm publishing uses trusted publishing with GitHub OIDC; no long-lived npm token or PAT is required.
- The publish job runs in the `npm-release` GitHub environment.
- Release tags publish to npm with the default `latest` dist-tag.
- The publish job fails unless the tag version matches `package.json` and the tag points at the latest `main` commit.

## Commands

```bash
git switch -c release/1.0.0-beta.3
git push -u origin release/1.0.0-beta.3

git checkout main
git pull
git tag v1.0.0-beta.3
git push origin v1.0.0-beta.3
```

## Notes

- Keep the git tag and `package.json` version aligned.
- Create the release tag from the latest `main`, not from the release branch tip.
- Use `bun run fix` for local Biome autofixes when needed.
- Real subgraph integration tests may depend on external subgraph availability.
