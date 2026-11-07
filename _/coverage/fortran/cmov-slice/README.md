# First semantic claim slice

The slice is eight historical false-CMOV findings plus 117 historically partial
descriptions. [claims.tsv](claims.tsv) identifies the eight occurrences, their
four distinct encodings, operand aliases, predicates and claimed writes.
[remaining.tsv](remaining.tsv) records the other 117 by family with explicit
unverified obligations. These are occurrences across object and linked copies;
they do not enlarge the nine-listing native denominator.

The current repaired CMOV wording agrees with this narrow rule: choose source
low bits when the condition holds, otherwise retain destination low bits; clear
the enclosing register's high half in either outcome. The instructions preserve
condition flags. All eight encoded sources are registers. Memory-source fault
behavior is a separate unexercised boundary, not evidence about these operands.

Primary reference: [Intel SDM CMOVcc at commit 48741fad](https://github.com/intel/SDM/blob/48741fad8f9cd646450c6f98ae945ff55acbd558/data/sdm/CMOVcc.docbook),
Git blob `72a27b29b4e5287f03ca83155964c8e501bb49eb`. The independently retrieved
official PDF corroborates the rule: Intel 253666-060US, September 2016, Volume
2A, printed pages 3-149 through 3-152 (PDF pages 251–254).
[Official PDF](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-vol-2a-manual.pdf).
The PDF URL is mutable; its observed revision is recorded rather than treating
the locator as a permanent content hash. The separate source blob is pinned.

The independent ai-ci check reads original Git blobs at
`0655e12c0e19b3dde360ed097ee88ba7b2c6d060`, decodes the archived ELF files with
GNU objdump and decodes the four CMOV encodings' REX/ModRM fields separately.
It binds every claim to current English operands, aliases, conditional selection,
flag-preservation wording and sequential successor. It compares the parsed
English predicates with the opcode rule for all 32 assignments to CF/PF/ZF/SF/OF
at each of eight occurrences: **256 flag assignments**. Three disclosed operand
pairs yield **768 modeled transitions**, not exhaustive 64-bit data testing.
The eleven targeted corruptions include changed primary bytes, inverted predicates, wrong source registers,
lost high-half writes and false completion claims.

This is **finite claim consistency**, not new native instruction execution,
whole-state equivalence or complete instruction certification. Instruction fetch,
availability, exceptions, platform behavior and arbitrary surrounding state are
not fully qualified. The existing native witness remains historical; it was not
rebuilt or rerun for this slice. All 1,542 complete-effect form statuses remain
UNVERIFIED. The frozen 45-file inventory and the linked ARM overlay are unchanged.

## Reproduction and failure recovery

Use the exact ai-ci pin in `.github/workflows/fortran-coverage.yml` and materialize
Intel/SDM at the reference commit above. Run
`node /ABSOLUTE/ai-ci/fortran-coverage/check-cmov-claims.mjs --repository /ABSOLUTE/English-major-C --primary-file /ABSOLUTE/SDM/data/sdm/CMOVcc.docbook --self-test --receipt /ABSOLUTE/FRESH.tsv`.
The receipt and its `.cases.tsv` companion bind both candidate heads, the primary
blob/digest, the claim tables and the finite model cases. They require clean
material paths and refuse existing destinations.

Unavailable Git objects, missing reference bytes or unavailable objdump stop the
check. Recover the exact named source, verify its identity and retry. A changed
reference fails `PRIMARY_REFERENCE_CHANGED`; do not substitute a current manual
and silently reuse an old receipt. Changed instruction/operand/claim identities
fail separately. The check executes no original ELF or QR interpreter.

## Bounded next work

The CMOV claim boundary and finite source checks are implemented. The 117
shift/multiply/scalar-FP descriptions still need independent complete-effect
verification. First bound the 27 shift occurrences (14 SHL, 12 SAR, one SHR)
against exact counts, widths, flag definitions and undefined outcomes. Keep their
complete-effect status unverified until primary rules and independent witnesses
cover that finite boundary. Multiplication and floating exceptions follow as
separate slices; libraries and whole-Fortran coverage remain UNKNOWN.
