# English Major Fortran — archived-corpus inventory

This one-off inventory proceeds directly under the human's 2026-10-18 waiver of
Flexible Pipes. The failed preflight in preflight/ is historical and superseded.
No QR interpreter extension, compilation, or new QR execution occurred.

The measured corpus is precisely the six pinned current trees, not every Git
history object or upstream library. The original ZIP retained in earlier Git
history is preserved there and is not counted as another current-tree specimen.

ARCHIVED_SUPPORT artifacts, including the compressed historical trace, logs,
licenses and parser/checker sources, are preserved by identity. Their full
content semantics and behavior were not audited. This interpretation gap remains
explicit; hashing a trace is not verification of its states.

**Byte accounting is checked. Complete instruction semantics, library closure
and whole-language coverage are not established.**

Successor: [linked ARM ledgers](arm-linked/README.md) add first-pass English for
the 3,442 instruction rows missing from these frozen trees. The historical
tables below and generated/ remain unchanged; the successor records annotation
coverage separately and grants no complete semantic or library claim.

[First semantic claim slice](cmov-slice/README.md) checks the eight repaired
CMOV occurrences against a pinned Intel source and finite flag/data cases.
The other 117 historically partial descriptions retain separate obligations.
No complete-effect form, native-execution or language-coverage claim is promoted.

| Dimension | Observed accounting | Boundary |
| --- | --- | --- |
| Frozen inputs | 6 commits; 331 file occurrences; 136 distinct SHA-256 artifacts | Whole pinned trees; overlapping snapshots deduplicated by bytes |
| Fortran sources | 8 files: 3 QR and 5 reference BLAS | Physical lines recorded, not language-wide support |
| ELF files/physical bytes | 18 files; 215,080 bytes partitioned | Includes headers, sections and explicit unassigned/padding ranges |
| Relocations | 1,345 | Includes debug/metadata; old 66 x86 and 43 A32 totals were printed code relocations |
| Native listing records | 7,426 instructions; 114 data rows in 9 listings | Static occurrences across overlapping specimens, not independent runtime instructions |
| ISA breakdown | x86-64 2,835; A32 4,523; T32 68 | Routine-copy relationships preserve object/linked distinctions |
| English alignment | 3,984 distinct instruction rows aligned; 3,442 explicitly missing | Missing linked softfp 2,005 and linked hardfp 1,437 |
| Complete semantic verification | 0 of 1,542 observed operand-specific forms certified for every required effect | Narrow historical findings remain separate |
| Library closure | UNKNOWN / UNKNOWN | Embedded BLAS bodies coexist with missing dynamic libraries and loader code |
| Language catalogue | 35 selected families: 21 source-exhibited; 14 documented/not exercised | Whole Fortran denominator UNKNOWN |

The original A32 objects still contain 1,149 printed instructions and 16 printed
data words. Seven suppressed DATA ranges contain 60 captured zero bytes, including
8 omitted from the printed dqrdc2 A32 listing. Nine object code sections contain
7,340 bytes without their own captured object disassemblies. These are explicit
missing interpretations, not discarded bytes or invented instructions.

## Evidence chain

[Source pins](source-heads.tsv) → [original path/blob occurrences](generated/occurrences.tsv)
→ [SHA-256 artifacts](generated/artifacts.tsv) → [source lines](generated/source-lines.tsv)
and [build provenance](generated/build-provenance.tsv) →
[DWARF line evidence](generated/dwarf-lines.tsv) and
[source/machine crosswalk](generated/source-machine-crosswalk.tsv) →
[native bytes/operands](generated/records.tsv) →
[English crosswalk](generated/english-crosswalk.tsv) →
[semantic obligations](generated/semantic-forms.tsv) and [gaps](missing.tsv).

Every physical source line is retained. DWARF correlations retain ambiguous views,
absent source files and missing mappings; compiler line ranges do not prove meaning
or give a valid optimized-source execution denominator.

[ELF inventory](generated/elf.tsv), [sections](generated/sections.tsv),
[program headers](generated/program-headers.tsv), [symbols](generated/symbols.tsv)
and [file ranges](generated/file-ranges.tsv) account for physical structure.
NOBITS storage is distinguished from file bytes. Unassigned byte ranges retain
exact digests and unknown meaning.
[All relocations](generated/relocations.tsv) are separate from
[printed relocations](generated/printed-relocations.tsv); raw readelf diagnostics
preserve relocation names. [Listing gaps](generated/listing-gaps.tsv) retain exact
bytes/offsets, including suppressed zeros and unlisted object code.

Native records retain every original line, section, symbol, operand, ISA, encoded
width, file offset and sequential execution index. Actual branch/exception
successors remain semantic obligations.
The English table has 6,835 versioned instruction/data rows, including historical
annotation variants. Do not add them to the native instruction total.
[Missing English](generated/missing-english.tsv) and
[routine copies](generated/routine-copies.tsv) prevent hidden omissions or treating
relocated object/executable copies as independent runtime code.

## Semantics and dependencies

[Register vocabulary](generated/register-vocabulary.tsv) records observed names,
widths and general-register aliases; implicit writes, full register-list expansion
and SIMD overlap effects remain unverified.
Every observed form has explicit unknown fields for implicit registers, memory
reads/writes, faults, ordering, flags/predicates, control/exception changes,
rounding, NaNs, signed zero, denormals, FP exceptions and ABI/call/return effects.

[Historical findings](generated/historical-semantic-findings.tsv) retain the earlier
x86 audit and both original/repaired annotation versions. Eight false-CMOV
occurrences and 117 expanded descriptions do not become whole-state certification.
No contradiction was deleted to improve coverage.

[Calls](generated/calls.tsv) retain 182 static occurrences across specimens,
including the original 64 x86 CALL rows. They are neither dynamic frequencies nor
unique logical calls. Relocation targets, PLT stubs, captured addresses and
unresolved indirect targets remain distinct.
[Dependencies](generated/dependencies.tsv) and [boundary obligations](boundaries.tsv)
separate interface evidence from implementation bytes and process closure.

The softfp ELF contains all five reference BLAS bodies. The x86/hardfp ELFs depend
on dynamic libblas. Captured libc/loader stubs and paths do not capture their
implementations. Historical recipes mention -lgfortran and -lm, but captured
linked ELF DT_NEEDED entries do not name those two libraries; no transitive-runtime
absence or semantic claim follows from this.
Only the standalone C harness and an R example are archived: the R interpreter,
Cdqrls integration, model/frame/matrix machinery, allocation/attributes and R-side
NA/error behavior remain outside captured whole-process implementation evidence.

## Fortran profile

The described profile is the **archived GNU Fortran 14.2.0 QR/reference-BLAS
specimens**, not a complete English Major ISO Fortran frontend.
Recorded commands do not select -std=. Fixed-form .f and free-form dnrm2.f90 are
present; the latter includes kinds, real(wp), parameter constants and inquiry
intrinsics. GNU documents its default GNU dialect and extension-based source form
in [its versioned dialect options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gfortran/Fortran-Dialect-Options.html).
This does not establish F77/F90/F95/F2003/F2008/F2018/F2023 conformance.

The [35-family catalogue](generated/fortran-features.tsv) contains lexical source
witnesses for procedures, arguments, arrays, types, kinds, intrinsics and control
flow. Modules, derived types, pointers, allocation, Fortran I/O, generic/optional
interfaces, COMMON/EQUIVALENCE/SAVE, STOP, coarrays/teams, DO CONCURRENT and BIND(C)
are documented as not exercised. Reused array arguments do not settle aliasing or
storage-association legality. C printf does not count as Fortran I/O support.
This catalogue is deliberately not a denominator for the full language.

## Reproduction and acceptance

[The generator](../../autogenerated/fortran-coverage/audit.mjs) uses Node
built-ins, Git and GNU readelf. It resolves its own root and never runs an original
executable. From any directory, invoke Node with its absolute path and
--repository ABSOLUTE_CHECKOUT --output ABSOLUTE_FRESH_DIRECTORY. Use --check
against the committed generated directory. Existing output is refused for writes.
All six exact Git objects in source-heads.tsv must be available.

A missing Git object, changed byte, unsupported ELF form or unavailable readelf
fails at that boundary. Recover the exact original commit/blob/library artifact,
check its identity and create a new attempt; never replace it with a moving
branch, rebuilt specimen or altered expected digest.

The independent [isomorphisms/ai-ci PR #291, “Independently check archived Fortran machine-evidence accounting”](https://github.com/isomorphisms/ai-ci/pull/291)
supplies [oracle a58c37e](https://github.com/isomorphisms/ai-ci/tree/a58c37e913d6866f7fd5737a91e3f68649810a03/fortran-coverage).
It independently reads Git blobs and readelf section/mapping/relocation evidence,
without importing the producer or trusting its summary. The original corpus
passes and 17 targeted mutants fail for their named diagnostics.
This is **structural acceptance only**; semantic, library and language statuses
remain unverified/unknown. Exact-head receipts are linked in the draft PR
description, avoiding a receipt commit changing the tested leaf head.

[Missing elements](missing.tsv), [bounded SUN jobs](follow-ups.md) and
[primary reference leads](references.tsv) retain the remaining work.
The Idriç attempt's real compiler-bootstrap failure and the first generator's
retained-string memory failure are preserved with their recovery paths.
Original source, objects, binaries, disassembly, annotations and findings are
unchanged. This inventory grants no merge authority or unbounded completeness claim.
