# English Major C

English Major C is an experimental programming language intermediary specifying machine instructions, assembly, or virtual-machine operations in precise, verbose, English.

**DEX architectural catalogue:** [DEX instructions in precise English](architecture/dex/README.md)
accounts for all 256 primary byte values, with separate entries for 224
standard instructions and 32 reserved values, all three payloads, version
boundaries and a plaintext inventory. It is independent of the compiler's
supported subset. [The audit](evidence/DEX-catalogue-audit.md) distinguishes
source-table coverage from semantic review, runtime execution and ai-ci
acceptance. The existing ARM documentation and experiments are unchanged.

A first narrowly constrained, independent English-to-ARM Thumb compiler has now been written as a concrete experiment; no general parser, type system, compiled runtime, or physical-device acceptance is claimed.

**First executable experiment:** [An unknown entry is omitted from an addition](examples/unknown-entry-sum/README.md) supplies a direct English-to-Thumb assembler compiler, a source-line-aligned native listing, rejection tests, and a complete architectural trace. Its single-architecture/no-ICK/no-premature-types decision is in [the direct compiler decision record](decisions/Why%20the%20first%20compiler%20emits%20assembly%20directly.english). This experiment is not R-compatible and has not yet run on ARM hardware.

**Frontend research, not yet implemented:** [Idriç source-item choices](research/Idri%C3%A7%20source%20items%20are%20operations%20or%20comments.md) model executable operations, nonexecuting comments, explanations, register-name declarations, instruction labels, and the selected machine as different source categories. These declarations have not been checked by the Idriç compiler; the current English text compiler still uses its original small sentence recognizer. ICKY is not an active dependency of this first experiment.

**Start here:** [Given a machine: objects, processes, and execution](architecture/armv7-a/t32/Given%20a%20machine%20-%20objects%20and%20execution.english). Read the closed operation grant next, then the architecture provenance and alternatives record.

## Given these exact documents

1. [Given a machine - objects and execution.english](architecture/armv7-a/t32/Given%20a%20machine%20-%20objects%20and%20execution.english) defines the execution index, software-visible registers, memory, permissions, fetching, branching and the boundary between code and data.
2. [All and only these initial operations are permitted.english](architecture/armv7-a/t32/All%20and%20only%20these%20initial%20operations%20are%20permitted.english) names the **initial, deliberately limited** scalar T32 operation set in long English. Its ARM mappings and ISA limitations are normative constraints, not assembler shortcuts.
3. [Instruction set architecture - sources and unfulfilled coverage.english](architecture/armv7-a/t32/Instruction%20set%20architecture%20-%20sources%20and%20unfulfilled%20coverage.english) identifies ARM DDI 0406C.d, optional extensions, revision and verification obligations, and what is **not yet** completely specified.
4. [Choices for missing-value branching and execution.english](decisions/Choices%20for%20missing-value%20branching%20and%20execution.english) retains competing strategies and the tests required to select one. This is a decision history, not an assembly-performance claim.
5. The separately authored exact definition of "execution index" is under [PR #2 — Define the execution index](https://github.com/dilapidated-shed/English-major-C/pull/2); that PR has since merged to main, without implying acceptance of the broader ISA.

## Exact instruction-fetch, control-flow, and code/data documents

The following additional files narrow the initial machine model without pretending the complete ARM ISA has already been defined.

- [Which instruction is next and how it is found.english](architecture/armv7-a/t32/Which%20instruction%20is%20next%20and%20how%20it%20is%20found.english): two-byte and four-byte T32 decoding, execution index versus PC operand, branch destinations, BL return tagging, and source-level instruction boundaries.
- [Exactly when execution branches.english](architecture/armv7-a/t32/Exactly%20when%20execution%20branches.english): all the common condition predicates stated in English, signed/unsigned comparisons, CBZ/CBNZ restrictions, IT, indirect calls and TBB/TBH table data.
- [When bytes mean data and when bytes mean instructions.english](architecture/armv7-a/t32/When%20bytes%20mean%20data%20and%20when%20bytes%20mean%20instructions.english): byte interpretations, user-process permissions, native machine code versus interpreted bytecode, executable memory, and alternative designs.
- [What the current instruction grant does not yet contain.english](architecture/armv7-a/t32/What%20the%20current%20instruction%20grant%20does%20not%20yet%20contain.english): remaining stack and memory forms, arithmetic, synchronization, floating-point, SIMD and system instruction families; the independent completeness obligations.

An initial byte-level bottom-up witness is [One actual Thumb branch listing translated from the bottom upward.english](examples/One%20actual%20Thumb%20branch%20listing%20translated%20from%20the%20bottom%20upward.english), based on a pinned Android Open Source Project assembler expectation. It records exact observed 16-bit halfwords and an independently specified English trace. The witness revealed that **MOVS (immediate) with flag changes requires a distinct long English operation**, now entry 53 in the initial grant. The specified trace has NOT been executed by an English Major C interpreter.

## Stack operations and word-transfer examples

[How registers enter memory and return from a stack.english](architecture/armv7-a/t32/How%20registers%20enter%20memory%20and%20return%20from%20a%20stack.english) defines seven additional **narrow** T32 instructions: PUSH, POP without or with a PC branch, STMIA, LDMIA, and immediate additions/subtractions of SP. The list ordering, exact transfer addresses, normal-success writeback, fault boundaries, T32-only return state and still-ungranted wide forms are explicitly recorded.

[Actual Thumb word transfers translated into English.english](examples/Actual%20Thumb%20word%20transfers%20translated%20into%20English.english) reads four pinned Android ART assembler expectation halfwords, `C409`, `CC09`, `B014` and `B094`, as independent instruction specimens. It does not pretend their original fixture arrays constitute one executed program.

The closed initial scalar operation grant now contains **73** entries, not the full ARMv7-A T32 ISA. Presence of an instruction in hardware is not equivalent to its authorization in this initial English Major C profile.

[Actual wide Thumb multiple-word operations in long English.english](examples/Actual%20wide%20Thumb%20multiple-word%20operations%20in%20long%20English.english) adds four precise, separately named 32-bit T32 STMIA and LDMDB operations, with and without base-register writeback. Each is anchored to a separate pinned AOSP expected-disassembly entry. The specification does not silently equate a four-byte Thumb encoding with two consecutive two-byte instructions.

## Bit operations and a fully accounted-for decode region

[Exactly how register bits are rearranged.english](architecture/armv7-a/t32/Exactly%20how%20register%20bits%20are%20rearranged.english) defines operations 65–72: the restricted native forms of REV, REV16, REVSH, RBIT, BFC, BFI, UBFX and SBFX. These are actual long English operation names, not commentary substituting for short native mnemonics.

[Every halfword in one complete Thumb decode region.english](architecture/armv7-a/t32/Every%20halfword%20in%20one%20complete%20Thumb%20decode%20region.english) and [its complete 256-row data table](fixtures/armv7-a-t32-byte-reversal-halfwords.tsv) account for **every** 16-bit T32 encoding with first byte 0xBA. The partition is 64 REV, 64 REV16, 64 UNDEFINED (reject), and 64 REVSH. This is intentionally an exhaustive **subtree**, not the complete Thumb ISA.

[Eight Thumb bit operations translated until the first ungranted instruction.english](examples/Eight%20Thumb%20bit%20operations%20translated%20until%20the%20first%20ungranted%20instruction.english) starts from inspected ARMv7-A T32 bytes assembled by a separate diagnostic tool, applies the eight permitted long-English operations in actual byte order, and stops at TEQ because it remains outside the present operation grant. It does not invent a successful translation for TEQ, ORN, or RRX.

## Exhaustive conditional-branch, undefined, and supervisor-call encodings

[Every conditional-branch and supervisor-call halfword.english](architecture/armv7-a/t32/Every%20conditional-branch%20and%20supervisor-call%20halfword.english) accounts for every one of the **4,096** two-byte Thumb encodings from `D000` to `DFFF`, including all 14 architectural flag conditions, correctly signed and scaled branch displacements, the distinction between sequential `A+2` and branch-relative `A+4`, and the T1 conditional-branch prohibition inside an IT block.

The complete [4,096-row instruction-class table](fixtures/armv7-a-t32-conditional-branch-and-exception-halfwords.tsv) distinguishes 3,584 permitted-form conditional branches, 256 decoded-but-ungranted `UDF` (permanently undefined) encodings, and 256 decoded-but-ungranted `SVC` (supervisor-call) encodings. The [224-row condition-flag truth table](fixtures/armv7-a-t32-conditional-branch-flag-truth-table.tsv) covers all fourteen branch predicates against all sixteen possible N/Z/C/V bit combinations.

[A conditional branch chooses which exceptional instruction is next.english](examples/A%20conditional%20branch%20chooses%20which%20exceptional%20instruction%20is%20next.english) translates a small byte-verified native instruction sequence, showing how branches select between paths that would encounter `UDF` and `SVC`. In the current permission profile, the English translation **stops** at either exception rather than inventing an operating-system effect.

The `BA00–BAFF` and `D000–DFFF` exhaustive subtrees are disjoint and account for **4,352 individual 16-bit halfword values** in total. Most of ARMv7-A T32 still remains unenumerated, including other 16-bit and 32-bit instruction groups. These two decoder subtrees do not expand the separately declared set of **73 permitted long-named operations**.

[The exact diagnostic audit receipt](evidence/2026-10-11-Dxxx-Thumb-decode-audit.english) records tool versions, SHA256 digests for transient assembler/decoder artifacts, all **4,096** independently checked halfword classifications, **3,584** independently checked branch displacements, the two unexpected LLVM aliases for `UDF`, and **2,366** arithmetic condition comparisons. These are limited diagnostic/source checks, **not** first-party compiler, executable-English, or physical-device acceptance.

## Exhaustive If-Then and hint decoding

[Every If Then and hint halfword.english](architecture/armv7-a/t32/Every%20If%20Then%20and%20hint%20halfword.english) accounts for **all 256 halfwords from `BF00` through `BFFF`**, using ARM DDI 0406C.d A6.2.5/A8.8.55. The full [256-row decoder table](fixtures/armv7-a-t32-if-then-and-hint-halfwords.tsv) distinguishes **214 context-dependent permitted `IT` forms**, 26 architecturally unpredictable `IT` forms, the one permitted `NOP` (`BF00`), four named but ungranted hints (`YIELD`, `WFE`, `WFI`, `SEV`), and eleven unallocated software-reserved hints that behave like no-ops but must not be used.

[One If Then block governs a short and a long instruction.english](examples/One%20If%20Then%20block%20governs%20a%20short%20and%20a%20long%20instruction.english) translates actual `CMP`, `ITE EQ`, two-byte `MOV`, four-byte `MOVW` and `NOP` diagnostic bytes, with two explicitly stated input states. The instruction-boundary addresses are identical for the two states, but their conditional register writes differ. Skipping a four-byte instruction's effects does not make its encoding two bytes long.

[The BFxx diagnostic receipt](evidence/2026-10-11-BFxx-Thumb-IT-and-hint-audit.english) preserves LLVM disassembly observations, including a case where LLVM prints `it al` for a form the ARM reference declares **UNPREDICTABLE**. The decoder display alone cannot grant executable source semantics.

The three earlier decoder subtrees `BA00–BAFF`, `BF00–BFFF`, and `D000–DFFF` account for **4,608 distinct numerical 16-bit halfword values**. The additional complete `E000–E7FF` and `BE00–BEFF` subtrees described below bring the cumulative count to **6,912**, without enlarging the separately declared set of **73 long-named permitted operations** or proving a complete Thumb ISA.

## Exhaustive short branches and breakpoint encodings

[Every short unconditional branch halfword.english](architecture/armv7-a/t32/Every%20short%20unconditional%20branch%20halfword.english) specifies every one of the **2,048** two-byte T32 B T2 encodings `E000–E7FF`, including exact signed eleven-bit displacements, PC-relative targets, and the rule that B T2 may appear **outside IT or as its last instruction slot**. The complete [2,048-row table](fixtures/armv7-a-t32-unconditional-branch-halfwords.tsv) gives a separate record for every machine halfword. This narrows existing operation 42, not the operation count.

[Every breakpoint halfword and its conditional-execution exception.english](architecture/armv7-a/t32/Every%20breakpoint%20halfword%20and%20its%20conditional-execution%20exception.english) accounts for all **256** `BE00–BEFF` BKPT T1 encodings, preserved in a [256-row table](fixtures/armv7-a-t32-breakpoint-halfwords.tsv). All remain **decoded but ungranted**: unlike ordinary IT-predicated instructions, BKPT requests a debug event **even when an enclosing IT predicate is false**, and the actual debug/OS response depends on the target.

[The same branch bytes acquire a condition from If Then state.english](examples/The%20same%20branch%20bytes%20acquire%20a%20condition%20from%20If%20Then%20state.english) demonstrates why LLVM displays the very same halfword `E000` as `b` outside IT, but `beq` when preceded by `IT EQ`. Two stated machine states take different paths, and both stop at the first ungranted `SVC`. The condition is inherited from **ITSTATE**, not encoded in the `E000` halfword itself.

The [E000/BE00 audit receipt](evidence/2026-10-11-E000-and-BE00-Thumb-decode-audit.english) records actual temporary diagnostic tool versions and SHA256s, 2,048 checked short-branch encodings and target calculations, 256 checked BKPT encodings, and explicit limitations.

The five previously classified disjoint subtrees `BA00–BAFF`, `BE00–BEFF`, `BF00–BFFF`, `D000–DFFF`, and `E000–E7FF` total **6,912 numerical 16-bit halfword values**. That is a decoder-classification statement, not complete ARMv7-A T32 semantics, execution authority, exception handling, a working frontend, or evidence of a processor run.

## Address formation, literal data, and control transfer

[Every halfword that forms an address from the execution position or stack pointer.english](architecture/armv7-a/t32/Every%20halfword%20that%20forms%20an%20address%20from%20the%20execution%20position%20or%20stack%20pointer.english) classifies **all 4,096 two-byte Thumb halfwords from A000 to AFFF**: 2,048 `ADR` T1 instructions which calculate `Align(instruction address + 4, 4) + 4 * unsigned imm8`, and 2,048 `ADD Rd, SP, #immediate` T1 instructions which compute `SP + 4 * unsigned imm8` into R0–R7 **without changing SP**. Their [complete 4,096-row table](fixtures/armv7-a-t32-address-generation-halfwords.tsv) records registers, immediates and computed addresses for two illustrative starting instruction locations.

[Every PC-relative data-word load halfword.english](architecture/armv7-a/t32/Every%20PC-relative%20data-word%20load%20halfword.english) classifies **all 2,048 halfwords from 4800 to 4FFF**. This distinct `LDR (literal)` T1 instruction calculates an aligned PC-relative address, then actually **reads a 32-bit data word from memory**. That read has separate mapping, permissions and fault requirements. Its [complete 2,048-row encoding table](fixtures/armv7-a-t32-pc-relative-word-load-halfwords.tsv) is not a proof that the reads were ever executed.

[An address a load and a branch disagree about the same bytes.english](examples/An%20address%20a%20load%20and%20a%20branch%20disagree%20about%20the%20same%20bytes.english) starts from **sixteen real assembled bytes**. It specifies a PC-derived address, a literal word load, and a branch around both `BKPT` and four literal-data bytes before stopping at ungranted `SVC`. The independent linear disassembler prints those literal bytes as plausible `LDRSB` and `ASRS` instructions; those are not instructions the selected execution-index path actually executes. This is direct evidence why the language must distinguish **decoded bytes**, **data reads**, and **executed instructions**.

[The address/data diagnostic receipt](evidence/2026-10-11-PC-relative-address-and-data-load-audit.english) records the actual foreign clang/LLVM 17 assembler/decoder and object hashes, **4,096** address-generation and **2,048** literal-load classification checks, and a deliberately retained diagnostic formatting failure (decimal versus hexadecimal immediate text) that was corrected before the complete literal-load comparison passed. No claim is made about ICK/NDK execution or an independent compiler acceptance check.

The previously completed five decoding regions accounted for 6,912 distinct two-byte halfword values. Adding the two disjoint A000–AFFF and 4800–4FFF regions yields **13,056 classified sixteen-bit halfword values** in seven closed decoder subtrees. The permitted long-named operation set now has **73 entries**: existing operations 40 and 41 were made encoding-precise, and new operation 73 names SP-relative address formation without changing SP. This remains a partial ARMv7-A T32 ISA specification, not a working frontend or verified physical-machine execution.

## Assembly-to-English decompilation target

[What a final English translation of assembly must contain.english](decompilation/What%20a%20final%20English%20translation%20of%20assembly%20must%20contain.english) defines the bottom-up translation target: begin from actual decoded machine instructions, account for all their machine-visible effects, preserve the original assembly and machine-code evidence, and allow arbitrarily extensive non-executable `(NOTE: ...)` and `(WHY? BECAUSE: ...)` explanations. This does **not** attempt to reproduce the route from R or another high-level language to the executable. The same principles apply to later A32 or x86-64 specimens after their exact machine contracts are supplied. The current 73-operation T32 grant is not enough to claim every possible real disassembly can already be expressed.

## Contract status

This revision is a **first source-level machine contract and closed initial operation profile**. It is **NOT** a complete independent transcription, enumeration, verification, or implementation of all ARMv7-A T32, Advanced SIMD, VFP, coprocessor, system, exception, or optional-extension instructions. Listing a short allowed vocabulary does not mean the physical CPU lacks other instructions.

The designated target is a **symbolic ARMv7-A processor executing T32 in unprivileged user mode**. No processor part number, DRAM part number, actual peripheral address, cache geometry, Android executable permission, VFP/NEON feature bit, or silicon timing has been measured or inferred. A deployed program must bind those facts in an independently verified target manifest before asserting that it runs on a particular device.

Authoring and GitHub publication of these text files are **not** evidence of language parsing, formal equivalence, compilation, ARM execution, or performance. No execution strategy is accepted merely because it appears in prose.

## Tracking

- [English Major C design and future Idris frontend exploration](https://github.com/dilapidated-shed/English-major-C/issues/1)
- [Flexible Pipes job envelope for this architecture source](https://github.com/isomorphisms/flexible-pipes/issues/91)
- [Execution-index definition job](https://github.com/isomorphisms/flexible-pipes/issues/90)
- No direct main-branch publication, merge authorization, or AICI acceptance is implied by the presence of this text.

## Separately bounded Megaparsec parser experiment

An exploration of precise ordinary-English descriptions of computation.

The [Megaparsec parser attempt](examples/autogenerated/megaparsec-parser/README.md)
recognizes the finite machine-operation sentences from the existing
unknown-entry example and produces typed source items. It preserves comments,
descriptive names, and source locations, with a separate name-validation stage.
The library and CLI compiled with GHC 9.4.7 and Megaparsec 9.3.1; all 43
parser/validation assertions passed. This is evidence for the bounded parser,
not for machine execution or a complete language frontend.

The original [maximum-function example](examples/a%20function%20which%20answers%20which%20of%20two%20given%20values%20is%20larger,%20written%20in%20English%20major%20C.)
uses a different, higher-level prose grammar and is outside this parser attempt.
The bounded parser result does not independently qualify the architecture,
compiler, translation, or Idriç experiments.
