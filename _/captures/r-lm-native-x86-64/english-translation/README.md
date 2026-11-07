# Machine-first English translation of the recorded R QR numerical path

**Status: working translation, not finished executable semantics.** This is
translation of evidence in [the archived experiment](../README.md), not a new
implementation of R, a fresh disassembly, a generated ARM binary, or a proof that
a machine executes the English source. Tracked in
[Flexible Pipes #94](https://github.com/isomorphisms/flexible-pipes/issues/94).
The original archive is an independent, unmodified base of this stacked branch.

## Preserve all representations, in the correct direction

1. **Fortran as provenance:** `../dqrls.f`, `../dqrdc2.f`, and
   `../dqrsl.f` are the actual comment-stripped inputs to the recorded build.
   `../call_r_qr.c` is the actual C test caller. An illustrative
   `../model_example.R` is *not* an executed R interpreter log.
2. **Original raw machine evidence:** `../dqrls.x86-64.disasm.txt`,
   `../dqrdc2.x86-64.disasm.txt`, `../dqrsl.x86-64.disasm.txt`,
   and `../linked-executable.x86-64.disasm.txt`, together with their
   original ELF objects and executable, are authoritative for *this build*.
   All are in the parent archival PR, with the source byte-integrity test.
3. **English-reading x86-64 translation:** each `*.english` concordance
   enumerates every printed instruction start in its named recorded listing,
   all bytes (including objdump continuation lines), the unmodified traditional
   operand spelling, and a first-pass ordinary-English operation description.
   This is the starting point of a *machine-first* reverse engineering project.
4. **English Major C or assembly as a checked language:** a future parser must
   distinguish executable sentences from commentary, enforce types/operand
   legality and grant lists, and preserve effects on the execution index,
   registers, flags, memory, floating-point status and external calls.
   The concordances are **not** that runnable checked language.
5. **ARM as a different possible implementation:** translating this numerical
   execution to A32/T32/AArch64 requires a separate ABI, ISA and floating-point
   model, explicit machine-code generation, source/target equivalence conditions,
   and independent tests. x86-64 native bytes cannot be called ARM assembly.
   The restricted ARMv7-A T32 language under
   [English Major C draft PR #3](https://github.com/dilapidated-shed/English-major-C/pull/3)
   does not yet grant the needed full numerical instruction set.

## Exact scope of the captured artifact

| Input listing | Printed machine instructions | What is represented |
| --- | ---: | --- |
| `dqrls.x86-64.disasm.txt` | 165 | One Fortran entry-point object, pre-link offsets |
| `dqrdc2.x86-64.disasm.txt` | 465 | The QR-decomposition / pivoting entry-point object |
| `dqrsl.x86-64.disasm.txt` | 662 | The QR-based response/solution entry-point object |
| **Three object listings** | **1292** | Count of individually addressable instruction records |
| `linked-executable.x86-64.disasm.txt` | 1543 | Linked C harness, runtime entry/PLT scaffolding and copies of the Fortran routines |

The linked listing **overlaps** the three object listings: 2,835 records
across four files are not 2,835 different runtime instructions. The linked
listing has three non-instruction gaps between disassembled sections (not a
claim that arbitrary bytes in these gaps are instructions).

**External boundary:** the listing of the linked executable does *not*
include the actual machine instructions inside dynamically loaded BLAS,
libgfortran, libc, libm or the loader. A line that calls a symbol through a
procedure linkage table (PLT) is not equivalent to knowing its implementation
or effects. Fortran alone is not an exhaustive executable representation of
those outside libraries either. No complete R interpreter executable was
captured. Do not claim a whole-process machine trace.

## Exact machine call boundaries

The separate [full CALL inventory](../../../../x86/r-qr/english/Every%20recorded%20call%20and%20its%20missing%20machine%20boundary.english)
classifies all 64 statically printed call instructions across the
overlapping object and executable listings: 6 to captured internal code,
56 to library procedures without captured implementation bodies, and
2 indirect calls whose runtime target depends on state not present in
the disassembly. These are static call sites, not runtime call counts.

The [first actual dqrls call walkthrough](../../../../x86/r-qr/english/Following%20the%20first%20actual%20QR%20call%20one%20memory%20operation%20at%20a%20time.english)
explains why changing RSP makes different stack offsets address different
by-reference Fortran arguments, and why the pre-link CALL placeholder
must not be mistaken for a concrete destination.

## Verification levels, do not conflate

- **Evidence checked in ancestor draft PR #5:** pinned files, numerical smoke,
  checksum ledger and negative mutation tests. This is historical evidence
  about the *archive*, not automatic acceptance of these new annotations.
- **Structural crosswalk:** `verify-english-ledgers.mjs` checks that the
  English rows reproduce every original printed instruction start, all
  contiguous byte fragments and relocation lines, exactly once and in order.
  It makes no claim about operand meaning. Every alteration of either input
  or translation must fail closed.
- **Semantic review:** exact integer width/flag corner cases, memory faults,
  aliasing, SSE/MXCSR exception behavior, external calls and the numerical
  trace are still subject to independent instruction-level and end-to-end
  verification. The first-pass explanatory sentences are not proof.
- **ARM execution:** **not attempted**; no x86-to-ARM machine lowering here.
- **Independent ai-ci / Flexible Pipes receipt:** **not demonstrated**.
  Source files must remain draft and unmerged until independent gates pass.

## How to read a record

`Execution index` means the memory address identifying the next instruction
to be fetched. For x86-64, sequential advancement uses the decoded
instruction's actual **byte** length, which here varies; a branch, call,
return, exception or external transition can replace it. An object listing
has local, not yet linked, offsets. Do not interpret the printed target of a
relocated call in an object file as the final target.

The record presents the original byte address, complete byte sequence,
traditional assembly and an ordinary-English account. An explanation can
refer to exact machine names as **data** while still giving the operation a
long, inspectable English description. Shared machine assumptions and
unresolved alternatives are in
[What exists in this x86-64 machine execution.english](../../../../x86/r-qr/english/What%20exists%20in%20this%20x86-64%20machine%20execution.english).

## Why four parallel ledgers?

The original standalone object files preserve the direct codegen for each
Fortran numerical routine, including relocations. The linked executable
supplies the actual call-site layout, C caller and linker scaffolding and
resolves some object-relative relocations. We retain both instead of
silently substituting one for the other. Neither listing reports a dynamic
execution sequence: disassembly contains unexecuted branches and cold paths.

## Corrections to the audited descriptions (2026-10-14)

[Independent audit EMC-3](https://github.com/dilapidated-shed/English-major-C/pull/11) identified four distinct false 32-bit conditional-move statements, repeated in the linked listing (8 records), and 117 incomplete shift, signed-multiplication and scalar-floating descriptions. The original Fortran, ELF objects, instruction bytes, disassemblies, relocation rows and native harness are unchanged. See [the 22 native test cases and their original-error witness](https://github.com/dilapidated-shed/English-major-C/actions/runs/38205660058).

All eight conditional-move records now explain that the **upper 32 bits of the 64-bit register are cleared even on a false condition**. All 117 audited incomplete records have expanded operand-specific effects: effective shift counts and defined/undefined flags; explicit two- or three-operand signed multiplication and overflow flags; complete ordered/unordered comparison flag tables; legacy MAXSD NaN and signed-zero priority; and scalar binary64 register-lane, operand-order, and MXCSR considerations. The remaining unverified floating exceptional cases are described as **not yet verified**, not silently accepted.

The new \`verify-repaired-qr-english.mjs\` checks the eight exact bad encodings and the 117 audited incomplete records for the required corrected rules, with known-bad mutation fixtures. This is a **source-level regression gate** and cannot certify every Intel machine-state transition. The original independent audit remains a historical failure witness for the old head; it is not a semantic PASS receipt for this new head. All 153 separately classified control/environment boundaries, dynamic BLAS and runtime bodies, and complete QR execution remain unresolved. Do not merge without the required independent acceptance.

## Open work to claim a complete translation

A fully checked result needs: formal operand parser and instruction decoder
against the bytes; exact per-instruction state transformers for the full
recorded subset; declared supported CPU and operating-system behaviors;
relocation/link-table verification; external BLAS/runtime implementations or
explicit interface semantics; complete exception/FP/rounding handling;
executed-case trace; separate ARM codegen and equality tests if desired.
These are **not satisfied** just because every instruction now has an
English line.

Do not confuse conventional R `lm` (minimizes squared *vertical*
residuals) with the separately proposed unsquared perpendicular-distance
line fit in [English Major C issue #4](https://github.com/dilapidated-shed/English-major-C/issues/4).
