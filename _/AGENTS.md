# Agent instructions

Apply the shared evidence and acceptance guardrails in
`isomorphisms/ai-ci/AGENTS.md`.

Before changing this repository, read its README and repository-local
documentation, inspect the current branch/worktree and nearby active work, and
preserve established architecture, terminology, source/build layout, and
explicit current human corrections.

Keep this file repository-specific. Add local rules as the project develops; do
not copy the shared `ai-ci` rulebook here.

## Keep the repository readable

The visible subjects are `fortran/`, `arm/`, `dex/`, `x86/`, and `kernel/`.
Put internal implementation, tests, fixtures, generated accounting, captured
binaries, audits, design history, and development experiments under `_/`.
Keep the root README short and link directly to those subjects. Place the
actual source and assembly files there, not just links to an internal archive.
Keep A32 and Thumb/T32, and hardfp and softfp captures, distinct.

Update `_/path-map.tsv`, executable consumers, workflow paths, and local links
when moving material. Preserve paths inside pinned historical Git snapshots,
capture output, and checksum records. Do not rewrite their evidence as if it
had been collected in the new layout.

GitHub workflow definitions, Git attributes, and the short root AGENTS pointer
remain at their required discovery locations.
