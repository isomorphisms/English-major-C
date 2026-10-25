# One-off archived Fortran coverage audit

The human explicitly waived Flexible Pipes on 2026-10-18 and asked to continue.
The earlier refusal remains historical evidence, not an active admission rule.

## Type and effect sketch

An artifact has a source commit, exact path, Git blob identity and SHA-256.
An ELF file contains file regions, sections, virtual zero-fill regions, symbols
and relocations. A listing record has a specimen, section, byte address, ISA mode,
encoding, operand text and optional annotation reference. A missing interpretation
is a value, never a reason to discard the underlying bytes.

accounted_file_bytes : List file_interval → byte_count
complete_partition : artifact → List file_interval → verification
semantic_status : instruction_form → captured | annotated | verified | unknown

Pure interval checks must reject overlap and omission. File reading, Git object
access, SHA-256, ELF parsing, subprocess readelf diagnostics, TSV publication and
fixture mutation are effects. Equality is exact bytes and typed identities.
Linked copies remain separate specimens; unique artifact digests deduplicate
snapshots, while routine-copy relations prevent adding object and executable
counts into a false runtime total. Semantic coverage never follows from row count.

## Idriç slice before fallback

The small choice model uses the documented storage-neutral syntax at Idriç
2734ac5a86610eddfab73b1644d72b4ac85a65ee. The real edric one-step entrypoint
will be attempted and its first failure retained. No grammar or typechecking
success is claimed until observed.

Observed invocation on the disposable Ubuntu x86-64 host:
`/workspace/scratch/4ebb513cc100/Idric/edric --emit-one-step coverage-status.idric -o coverage-status.anf`
returned exit 2: `Idriç one-step emitter: compiler is not bootstrapped; run ./_/edric bootstrap`.
The actual invocation used the absolute source/output paths in this workspace.
The fallback is therefore exercised separately; Idriç remains BLOCKED.

The host audit additionally needs checked filesystem/Git/binary-buffer/ELF and
SHA-256 facilities. If the compiler cannot bootstrap, the bounded Node fallback
uses only built-in modules and external read-only binutils, matching the existing
machine-evidence experiments. It is not an Idriç acceptance result.

## First blocking capability and removal test

Provide a bootstrapped direct-host compiler plus qualified byte/file/hash effects.
Check this choice model, then port the finite ELF partition check and show an
unaltered specimen passes while an omitted byte and overlapping interval fail.
Do not replace the compiler with RefC or generate a success-only shell wrapper.
