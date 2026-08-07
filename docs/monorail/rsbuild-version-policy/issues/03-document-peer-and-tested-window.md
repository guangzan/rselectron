# 03 — Document the @rsbuild/core dependency and tested-window semantics

- Status: claimed
- Blocked by: 02

## What to build

User-facing documentation for the install contract and the warn-only tested window, so the friction story (declare `@rsbuild/core`) and the drift story (warning, never blocking) are explicit.

In `docs/en/guide/compatibility.md` and its zh mirror (`docs/zh/guide/compatibility.md` if that is the path convention; otherwise the existing en/zh mirror pair):

- State that `@rsbuild/core` is a required project peer (`^2.0.0` install contract) the application declares; npm 7+ / pnpm 8+ auto-install required peers, so a manual declaration is only needed for other package managers.
- Document the **Rsbuild tested window**: the frozen minor line per Rselectron release (e.g. tested `2.1.7` → window `>=2.1.0 <2.2.0`), that patch updates within the tested minor line are silent, and that out-of-window versions produce a warn-only `RSELECTRON_RSBUILD_UNTESTED` diagnostic across `dev` / `build` / `inspect` / `preview` — never a hard error, because the application owns its build tool.
- Contrast with Electron support window semantics (hard rejection) in one sentence, pointing at the same page's Electron section.

In the README quick-start (en and zh): add `@rsbuild/core` to the install line and a one-line note that Rselectron warns (never blocks) when the installed Rsbuild minor is outside the release's tested window.

## Acceptance criteria

- [ ] Compatibility docs (en/zh) describe the peer install contract, the tested-window definition, and the warn-only semantics with the `RSELECTRON_RSBUILD_UNTESTED` code.
- [ ] README quick-start (en/zh) install line includes `@rsbuild/core`; the warning note is present.
- [ ] `pnpm test:docs` passes (docs tests that assert compatibility-matrix text stay green; add an assertion for the tested-window wording if the docs test suite covers this page).
- [ ] Text uses domain vocabulary from `docs/monorail/CONTEXT.md` ("Rsbuild tested window"); no new terms invented.
