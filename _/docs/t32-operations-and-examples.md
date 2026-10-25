# T32 operations and examples

## Exact instruction-fetch, control-flow, and code/data documents

The following additional files narrow the initial machine model without pretending the complete ARM ISA has already been defined.

- [Which instruction is next and how it is found.english](../../arm/thumb/Which%20instruction%20is%20next%20and%20how%20it%20is%20found.english): two-byte and four-byte T32 decoding, execution index versus PC operand, branch destinations, BL return tagging, and source-level instruction boundaries.
- [Exactly when execution branches.english](../../arm/thumb/Exactly%20when%20execution%20branches.english): all the common condition predicates stated in English, signed/unsigned comparisons, CBZ/CBNZ restrictions, IT, indirect calls and TBB/TBH table data.
- [When bytes mean data and when bytes mean instructions.english](../../arm/thumb/When%20bytes%20mean%20data%20and%20when%20bytes%20mean%20instructions.english): byte interpretations, user-process permissions, native machine code versus interpreted bytecode, executable memory, and alternative designs.
- [What the current instruction grant does not yet contain.english](../../arm/thumb/What%20the%20current%20instruction%20grant%20does%20not%20yet%20contain.english): remaining stack and memory forms, arithmetic, synchronization, floating-point, SIMD and system instruction families; the independent completeness obligations.

An initial byte-level bottom-up witness is [One actual Thumb branch listing translated from the bottom upward.english](../../arm/thumb/listings/One%20actual%20Thumb%20branch%20listing%20translated%20from%20the%20bottom%20upward.english), based on a pinned Android Open Source Project assembler expectation. It records exact observed 16-bit halfwords and an independently specified English trace. The witness revealed that **MOVS (immediate) with flag changes requires a distinct long English operation**, now entry 53 in the initial grant. The specified trace has NOT been executed by an English Major C interpreter.

## Stack operations and word-transfer examples

[How registers enter memory and return from a stack.english](../../arm/thumb/How%20registers%20enter%20memory%20and%20return%20from%20a%20stack.english) defines seven additional **narrow** T32 instructions: PUSH, POP without or with a PC branch, STMIA, LDMIA, and immediate additions/subtractions of SP. The list ordering, exact transfer addresses, normal-success writeback, fault boundaries, T32-only return state and still-ungranted wide forms are explicitly recorded.

[Actual Thumb word transfers translated into English.english](../../arm/thumb/listings/Actual%20Thumb%20word%20transfers%20translated%20into%20English.english) reads four pinned Android ART assembler expectation halfwords, `C409`, `CC09`, `B014` and `B094`, as independent instruction specimens. It does not pretend their original fixture arrays constitute one executed program.

The closed initial scalar operation grant now contains **73** entries, not the full ARMv7-A T32 ISA. Presence of an instruction in hardware is not equivalent to its authorization in this initial English Major C profile.

[Actual wide Thumb multiple-word operations in long English.english](../../arm/thumb/listings/Actual%20wide%20Thumb%20multiple-word%20operations%20in%20long%20English.english) adds four precise, separately named 32-bit T32 STMIA and LDMDB operations, with and without base-register writeback. Each is anchored to a separate pinned AOSP expected-disassembly entry. The specification does not silently equate a four-byte Thumb encoding with two consecutive two-byte instructions.

## Bit operations and a fully accounted-for decode region

[Exactly how register bits are rearranged.english](../../arm/thumb/Exactly%20how%20register%20bits%20are%20rearranged.english) defines operations 65–72: the restricted native forms of REV, REV16, REVSH, RBIT, BFC, BFI, UBFX and SBFX. These are actual long English operation names, not commentary substituting for short native mnemonics.

[Every halfword in one complete Thumb decode region.english](../../arm/thumb/Every%20halfword%20in%20one%20complete%20Thumb%20decode%20region.english) and [its complete 256-row data table](../fixtures/armv7-a-t32-byte-reversal-halfwords.tsv) account for **every** 16-bit T32 encoding with first byte 0xBA. The partition is 64 REV, 64 REV16, 64 UNDEFINED (reject), and 64 REVSH. This is intentionally an exhaustive **subtree**, not the complete Thumb ISA.

[Eight Thumb bit operations translated until the first ungranted instruction.english](../../arm/thumb/listings/Eight%20Thumb%20bit%20operations%20translated%20until%20the%20first%20ungranted%20instruction.english) starts from inspected ARMv7-A T32 bytes assembled by a separate diagnostic tool, applies the eight permitted long-English operations in actual byte order, and stops at TEQ because it remains outside the present operation grant. It does not invent a successful translation for TEQ, ORN, or RRX.
