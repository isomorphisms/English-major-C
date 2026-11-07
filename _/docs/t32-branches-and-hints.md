# T32 branches, exceptions, and hints

## Exhaustive conditional-branch, undefined, and supervisor-call encodings

[Every conditional-branch and supervisor-call halfword.english](../../arm/thumb/Every%20conditional-branch%20and%20supervisor-call%20halfword.english) accounts for every one of the **4,096** two-byte Thumb encodings from `D000` to `DFFF`, including all 14 architectural flag conditions, correctly signed and scaled branch displacements, the distinction between sequential `A+2` and branch-relative `A+4`, and the T1 conditional-branch prohibition inside an IT block.

The complete [4,096-row instruction-class table](../fixtures/armv7-a-t32-conditional-branch-and-exception-halfwords.tsv) distinguishes 3,584 permitted-form conditional branches, 256 decoded-but-ungranted `UDF` (permanently undefined) encodings, and 256 decoded-but-ungranted `SVC` (supervisor-call) encodings. The [224-row condition-flag truth table](../fixtures/armv7-a-t32-conditional-branch-flag-truth-table.tsv) covers all fourteen branch predicates against all sixteen possible N/Z/C/V bit combinations.

[A conditional branch chooses which exceptional instruction is next.english](../../arm/thumb/listings/A%20conditional%20branch%20chooses%20which%20exceptional%20instruction%20is%20next.english) translates a small byte-verified native instruction sequence, showing how branches select between paths that would encounter `UDF` and `SVC`. In the current permission profile, the English translation **stops** at either exception rather than inventing an operating-system effect.

The `BA00–BAFF` and `D000–DFFF` exhaustive subtrees are disjoint and account for **4,352 individual 16-bit halfword values** in total. Most of ARMv7-A T32 still remains unenumerated, including other 16-bit and 32-bit instruction groups. These two decoder subtrees do not expand the separately declared set of **73 permitted long-named operations**.

[The exact diagnostic audit receipt](../evidence/2026-10-11-Dxxx-Thumb-decode-audit.english) records tool versions, SHA256 digests for transient assembler/decoder artifacts, all **4,096** independently checked halfword classifications, **3,584** independently checked branch displacements, the two unexpected LLVM aliases for `UDF`, and **2,366** arithmetic condition comparisons. These are limited diagnostic/source checks, **not** first-party compiler, executable-English, or physical-device acceptance.

## Exhaustive If-Then and hint decoding

[Every If Then and hint halfword.english](../../arm/thumb/Every%20If%20Then%20and%20hint%20halfword.english) accounts for **all 256 halfwords from `BF00` through `BFFF`**, using ARM DDI 0406C.d A6.2.5/A8.8.55. The full [256-row decoder table](../fixtures/armv7-a-t32-if-then-and-hint-halfwords.tsv) distinguishes **214 context-dependent permitted `IT` forms**, 26 architecturally unpredictable `IT` forms, the one permitted `NOP` (`BF00`), four named but ungranted hints (`YIELD`, `WFE`, `WFI`, `SEV`), and eleven unallocated software-reserved hints that behave like no-ops but must not be used.

[One If Then block governs a short and a long instruction.english](../../arm/thumb/listings/One%20If%20Then%20block%20governs%20a%20short%20and%20a%20long%20instruction.english) translates actual `CMP`, `ITE EQ`, two-byte `MOV`, four-byte `MOVW` and `NOP` diagnostic bytes, with two explicitly stated input states. The instruction-boundary addresses are identical for the two states, but their conditional register writes differ. Skipping a four-byte instruction's effects does not make its encoding two bytes long.

[The BFxx diagnostic receipt](../evidence/2026-10-11-BFxx-Thumb-IT-and-hint-audit.english) preserves LLVM disassembly observations, including a case where LLVM prints `it al` for a form the ARM reference declares **UNPREDICTABLE**. The decoder display alone cannot grant executable source semantics.

The three earlier decoder subtrees `BA00–BAFF`, `BF00–BFFF`, and `D000–DFFF` account for **4,608 distinct numerical 16-bit halfword values**. The additional complete `E000–E7FF` and `BE00–BEFF` subtrees described below bring the cumulative count to **6,912**, without enlarging the separately declared set of **73 long-named permitted operations** or proving a complete Thumb ISA.

## Exhaustive short branches and breakpoint encodings

[Every short unconditional branch halfword.english](../../arm/thumb/Every%20short%20unconditional%20branch%20halfword.english) specifies every one of the **2,048** two-byte T32 B T2 encodings `E000–E7FF`, including exact signed eleven-bit displacements, PC-relative targets, and the rule that B T2 may appear **outside IT or as its last instruction slot**. The complete [2,048-row table](../fixtures/armv7-a-t32-unconditional-branch-halfwords.tsv) gives a separate record for every machine halfword. This narrows existing operation 42, not the operation count.

[Every breakpoint halfword and its conditional-execution exception.english](../../arm/thumb/Every%20breakpoint%20halfword%20and%20its%20conditional-execution%20exception.english) accounts for all **256** `BE00–BEFF` BKPT T1 encodings, preserved in a [256-row table](../fixtures/armv7-a-t32-breakpoint-halfwords.tsv). All remain **decoded but ungranted**: unlike ordinary IT-predicated instructions, BKPT requests a debug event **even when an enclosing IT predicate is false**, and the actual debug/OS response depends on the target.

[The same branch bytes acquire a condition from If Then state.english](../../arm/thumb/listings/The%20same%20branch%20bytes%20acquire%20a%20condition%20from%20If%20Then%20state.english) demonstrates why LLVM displays the very same halfword `E000` as `b` outside IT, but `beq` when preceded by `IT EQ`. Two stated machine states take different paths, and both stop at the first ungranted `SVC`. The condition is inherited from **ITSTATE**, not encoded in the `E000` halfword itself.

The [E000/BE00 audit receipt](../evidence/2026-10-11-E000-and-BE00-Thumb-decode-audit.english) records actual temporary diagnostic tool versions and SHA256s, 2,048 checked short-branch encodings and target calculations, 256 checked BKPT encodings, and explicit limitations.

The five previously classified disjoint subtrees `BA00–BAFF`, `BE00–BEFF`, `BF00–BFFF`, `D000–DFFF`, and `E000–E7FF` total **6,912 numerical 16-bit halfword values**. That is a decoder-classification statement, not complete ARMv7-A T32 semantics, execution authority, exception handling, a working frontend, or evidence of a processor run.
