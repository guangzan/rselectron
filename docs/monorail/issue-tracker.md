# Issue tracker (community)

GitHub Issues in [`guangzan/Rselectron`](https://github.com/guangzan/Rselectron/issues) are for **external bug reports and community requests** only.

Rail feature work (align / spec / slice / build) lives under `docs/monorail/`. See `docs/monorail/work-tracker.md`. Do not create GitHub Issues for rail engineering tickets.

## Access

- Use the `gh` CLI from this repository for issue reads and writes.
- Treat `guangzan/Rselectron` as the canonical repository when the current checkout or remote is ambiguous.
- Confirm authentication and repository access before attempting a write.

## Working rules

- Search open and closed issues before creating a new issue.
- Update an existing issue when it already represents the same unit of work.
- Keep issue descriptions self-contained and link relevant ADRs, compatibility-matrix entries, or monorail specs when useful.
- Apply triage labels according to `docs/monorail/triage-labels.md`.
- Do not use `.scratch/` markdown files as an issue tracker.
- Creating a PRD, align, or specification document does not itself authorize creating a GitHub issue; only create one when the user requests it for community-facing work.
