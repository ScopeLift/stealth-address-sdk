# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta.3] - 2026-04-13

### Added

- ERC-5564 compliant metadata builder helpers for ETH, ERC-20, ERC-721, and custom payloads
- `getAnnouncementsPageUsingSubgraph` for deterministic cursor-based subgraph pagination
- Stealth client support and exported types for the new paginated subgraph action

### Changed

- Pin subgraph pagination to a snapshot block for consistent multi-page scans
- Improve README coverage and JSDoc for the latest helper and subgraph APIs

### Fixed

- Harden metadata validation and related test coverage
- Make stealth address checks insensitive to address casing

## [1.0.0-beta.2] - 2024-11-21

### Added

- Improved announcement log fetching and subgraph handling
- Additional valid chain support and a new transfer example

### Fixed

- Contract address handling fixes

## [1.0.0-beta.1] - 2024-07-03

### Changed

- Publish script
- README spelling fix

## [1.0.0-beta.0] - 2024-07-02

### Added

- Initial beta release
