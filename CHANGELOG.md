# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added `impact`, `recommendations`, and `references` to `insightvm_finding`

### Changed

- Changed `insightvm_finding` and `insightvm_vulnerability`'s `name` property to
  use `vulnerability.title` from the API response

## [0.4.1] - 2022-12-15

### Fixed

- Updated jupiterone.md docs to correct part about Global Administrator role.

## [0.4.0] - 2022-12-02

### Changed

- Updated `validateInvocation`
- Added `FETCH_ACCOUNT_SITE_RELATIONSHIPS`
- Added `active` property to User entity.
- Added the following properties to rapid7 assets:
  - name, osName, osVersion, osDetails, platform, ipAddress, category, webLink,
    numCriticalVulnerabilities, lastScanDate
- Thanks @jakopako!

## [0.3.6] - 2021-09-07

- Tag for release

## [0.3.5] - 2021-08-31

### Changed

- Updated `@jupiterone/integration-sdk` packages
- Updated some code structure to match latest patterns

## 0.3.4 - 2021-07-16

### Changed

- Updated step execution handler name from `fetchAssetVulnerabilityFinding` to
  `fetchAssetVulnerabilityFindings` to more accuratley indicate that multiple
  findings are being fetched

## 0.3.3 - 2021-07-16

### Changed

- Adopted best practice of supporting `yarn test:env` to ensure `.env`
  credentials are utilized only when requested explicitly

### Fixed

- Fixed hard-coded `insightvm_vulnerability` properties `severity` and
  `numericSeverity`

## 0.3.2 - 2021-06-01

### Fixed

- Fix `UPLOAD_ERROR`. Removed raw data from assets to avoid step failures due to
  oversized payloads.

## 0.3.1 - 2021-05-28

### Changed

- Update `@jupiterone/integration-sdk-*` packages for latest logging of upload
  errors.
- Stop forcing `step-asset-vulnerabilities` to run last in dependency graph.

## 0.3.0 - 2021-02-16

### Added

- Re-added `insightvm_vulnerability` and `insightvm_finding_is_vulnerability`.
- Added debug-level logs for `findOrCreateVulnerability()`.

## 0.2.6 - 2021-02-12

### Fixed

- Fixed client pagination logic, which previously never terminated pagination
  when `request.body.page.totalPages === 0`.

## 0.2.5 - 2021-02-10

### Added

- Added `logger.debug` statement on API Client calls.

### Removed

- Temporarily removed `insightvm_vulnerability` and
  `insightvm_finding_is_vulnerability`

## 0.2.4 - 2021-02-09

### Changed

- Bumped SDK deps to 5.6.2.

## 0.2.3 - 2021-02-09

### Added

- Throw if `!response.ok` in ApiClient.request().

## 0.2.2 - 2021-02-05

### Changed

- Re-enabled `fetch-asset-vulnerabilities` to run in isolation and with debug
  statements.

## 0.2.1 - 2021-02-05

### Changed

- Disabled `fetch-asset-vulnerabilities` step temporarily.

### Fixed

- Fixed some missing step dependencies in `assets`, `scan-assets`,
  `site-assets`, and `site-users` steps.

## 0.2.0 - 2020-12-23

### Added

- Added error messaging about self-signed TLS certificates in Rapid7 Console.
- Added `disableTlsVerification` configuration error to bypass TLS certificate
  errors.
- Added `summary`, `category`, `internal`, `startedOn`, `completedOn` properties
  to `insightvm_scan` entities as required by the JupiterOne Data Model.

## 0.1.0 - 2020-12-18

### Changed

- Upgraded integration relationship classes to more closely align with the
  JupiterOne data model.
- Added `insightvm_finding` entity for asset vulnerabilities.
- Upgrade SDK v5.2

## 0.0.0 - 2020-10-06

- Initial Deployment: `insightvm_account`, `insightvm_user`, `insightvm_site`,
  `insightvm_scan`, `insightvm_asset`, `insightvm_vulnerability`
