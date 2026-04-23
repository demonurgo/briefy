---
phase: 03-ai-integration
plan: 03
subsystem: licensing
tags: [agpl, license, headers, npm, open-source]
key-files:
  created:
    - LICENSE
    - scripts/add-agpl-header.sh
    - scripts/add-agpl-header.ps1
    - .github/ISSUE_TEMPLATE/bug_report.md
    - .github/ISSUE_TEMPLATE/feature_request.md
  modified:
    - composer.json
    - README.md
    - package.json
    - package-lock.json
    - 115 PHP and TS/TSX files (AGPL headers applied)
metrics:
  files_headered: 115
  files_already_headered: 10
  npm_deps_added: 3
---

## Plan 03-03: AGPL-3.0 License + Headers + npm Deps

### Objective
Publish Briefy as open source under AGPL-3.0: LICENSE file, per-file copyright headers on all existing PHP/TS/TSX, README BYOK documentation, SPDX license in composer.json, and npm dependencies for Plans 08+.

### Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 79555b4 | LICENSE (AGPL-3.0 verbatim, 661 lines) + composer.json + README BYOK |
| Task 2 | 3c7df7f | add-agpl-header.sh + add-agpl-header.ps1 scripts |
| Task 2 | 7d9bd8e | Headers applied to 115 PHP and TS/TSX files |
| Task 3 | 3d2eddc | npm deps + GitHub issue templates |

### Results

- **LICENSE**: 661-line verbatim AGPL-3.0 text downloaded from FSF
- **composer.json**: `"license": "AGPL-3.0-or-later"` (was `"MIT"`)
- **README.md**: BYOK section with `/settings/ai` instructions + License section added
- **Header script (bash)**: idempotent, Windows guard pointing to PS twin, CI-friendly exit code
- **Header script (PS)**: UTF-8 no BOM, mirrors bash semantics exactly
- **Files headered**: 115 added, 10 skipped (already headered from Plan 03-02 work)
- **Idempotency verified**: Second run reports `Added: 0, Skipped: 125`
- **npm deps installed**: react-markdown@10.1.0, rehype-sanitize@6.0.0, remark-gfm@4.0.1 — 102 packages added, 0 vulnerabilities
- **GitHub issue templates**: bug_report.md (with BYOK checkbox) + feature_request.md

### Script used
Bash variant (`scripts/add-agpl-header.sh`) running in git-bash on Windows 11.
Windows devs without git-bash/WSL can use `scripts/add-agpl-header.ps1` instead.

### Intentionally skipped
- Blade templates (`resources/views/*.blade.php`) — blade-specific comment syntax optional for this pass
- `.env*` files — gitignored, never committed
- JSON files — no comment syntax; license declared in `composer.json` license field

### Deviations
None — all tasks executed exactly per plan spec.

### Self-Check: PASSED
- LICENSE ≥ 600 lines with correct GNU AFFERO header
- composer.json has AGPL-3.0-or-later
- README has BYOK + settings/ai + AGPL-3.0 mentions
- Both scripts exist with correct guards
- bash script idempotent (second run: Added: 0)
- grep -rL returns empty for app/*.php and resources/js/*.tsx
- react-markdown, rehype-sanitize, remark-gfm in package.json and node_modules
- GitHub issue templates present with BYOK checkbox
