# One completely accounted-for architectural path

**Status:** hand-derived register-and-instruction trace for the generated assembly, **not** an observed execution on an ARM processor. The instruction addresses and encodings were independently inspected in the preceding local assembler diagnostic. This file is a mathematical consequence of the declared instruction semantics and the starting state below.

The execution index is a byte address. Here `0x00`, `0x04` and so forth mean offsets relative to an unspecified executable code base, *not* physical or virtual addresses measured on a phone. In the initial machine state: register zero holds the valid input address `P`; register one holds `4`; the four successive four-byte little-endian words at `P`, `P+4`, `P+8`, and `P+12` hold `4`, `7`, `0xFFFFFFFF`, and `3`; and the link register holds a legal Thumb return address. Register two, register three, register twelve, and all condition flags begin as unknown. Memory reads succeed. `0xFFFFFFFF` is the reserved **unknown entry**, not a zero-valued entry.

All instructions described as not changing flags preserve N, Z, C and V. None of these operations changes any input memory byte or any register other than the specifically named destination. The initial stack is not examined or modified. Every instruction has already been reduced to its exact length in the assembled listing; the ordinary successor for a two-byte instruction differs from that for a four-byte instruction. `CMP` calculates flags without changing its operands.

| Step | Execution index before | Operation | Execution index after | Changes and condition |
|---:|---|---|---|---|
| 1 | 0x00 | Put zero into the running total | 0x04 | The running total becomes 0; flags are unchanged. |
| 2 | 0x04 | Write the low half of the unknown marker | 0x08 | The unknown-marker register becomes 0x0000FFFF; flags unchanged. |
| 3 | 0x08 | Write the high half of the unknown marker | 0x0C | The unknown-marker register becomes 0xFFFFFFFF; flags unchanged. |
| 4 | 0x0C | Compare the number of entries remaining with zero | 0x0E | Remaining count 4; Z=0, N=0, C=1, V=0; registers unchanged. |
| 5 | 0x0E | Transfer to the result instruction if no entries remain | 0x10 | Z=0: branch not taken; flags and registers unchanged. |
| 6 | 0x10 | Read the current entry from memory | 0x14 | The current entry becomes 4; memory unchanged. |
| 7 | 0x14 | Advance the address by four bytes | 0x18 | Address becomes P+4; flags unchanged. |
| 8 | 0x18 | Decrease the number of entries remaining by one | 0x1C | Remaining count becomes 3; flags unchanged. |
| 9 | 0x1C | Compare the current entry with the unknown marker | 0x1E | Compare 4 against 0xFFFFFFFF; Z=0, N=0, C=0, V=0. |
| 10 | 0x1E | Transfer to the count check if the entry is unknown | 0x20 | Z=0: branch not taken; addition follows; flags unchanged. |
| 11 | 0x20 | Add the current entry to the running total | 0x24 | The running total becomes 4; flags unchanged. |
| 12 | 0x24 | Transfer to the count check | 0x0C | Unconditional transfer; registers and flags unchanged. |
| 13 | 0x0C | Compare the number of entries remaining with zero | 0x0E | Remaining count 3; Z=0, N=0, C=1, V=0; registers unchanged. |
| 14 | 0x0E | Transfer to the result instruction if no entries remain | 0x10 | Z=0: branch not taken; flags and registers unchanged. |
| 15 | 0x10 | Read the current entry from memory | 0x14 | The current entry becomes 7; memory unchanged. |
| 16 | 0x14 | Advance the address by four bytes | 0x18 | Address becomes P+8; flags unchanged. |
| 17 | 0x18 | Decrease the number of entries remaining by one | 0x1C | Remaining count becomes 2; flags unchanged. |
| 18 | 0x1C | Compare the current entry with the unknown marker | 0x1E | Compare 7 against 0xFFFFFFFF; Z=0, N=0, C=0, V=0. |
| 19 | 0x1E | Transfer to the count check if the entry is unknown | 0x20 | Z=0: branch not taken; addition follows; flags unchanged. |
| 20 | 0x20 | Add the current entry to the running total | 0x24 | The running total becomes 11; flags unchanged. |
| 21 | 0x24 | Transfer to the count check | 0x0C | Unconditional transfer; registers and flags unchanged. |
| 22 | 0x0C | Compare the number of entries remaining with zero | 0x0E | Remaining count 2; Z=0, N=0, C=1, V=0; registers unchanged. |
| 23 | 0x0E | Transfer to the result instruction if no entries remain | 0x10 | Z=0: branch not taken; flags and registers unchanged. |
| 24 | 0x10 | Read the current entry from memory | 0x14 | The current entry becomes unknown marker 0xFFFFFFFF; memory unchanged. |
| 25 | 0x14 | Advance the address by four bytes | 0x18 | Address becomes P+12; flags unchanged. |
| 26 | 0x18 | Decrease the number of entries remaining by one | 0x1C | Remaining count becomes 1; flags unchanged. |
| 27 | 0x1C | Compare the current entry with the unknown marker | 0x1E | Compare unknown against 0xFFFFFFFF; Z=1, N=0, C=1, V=0. |
| 28 | 0x1E | Transfer to the count check if the entry is unknown | 0x0C | Z=1: branch taken; addition is skipped; flags unchanged. |
| 29 | 0x0C | Compare the number of entries remaining with zero | 0x0E | Remaining count 1; Z=0, N=0, C=1, V=0; registers unchanged. |
| 30 | 0x0E | Transfer to the result instruction if no entries remain | 0x10 | Z=0: branch not taken; flags and registers unchanged. |
| 31 | 0x10 | Read the current entry from memory | 0x14 | The current entry becomes 3; memory unchanged. |
| 32 | 0x14 | Advance the address by four bytes | 0x18 | Address becomes P+16; flags unchanged. |
| 33 | 0x18 | Decrease the number of entries remaining by one | 0x1C | Remaining count becomes 0; flags unchanged. |
| 34 | 0x1C | Compare the current entry with the unknown marker | 0x1E | Compare 3 against 0xFFFFFFFF; Z=0, N=0, C=0, V=0. |
| 35 | 0x1E | Transfer to the count check if the entry is unknown | 0x20 | Z=0: branch not taken; addition follows; flags unchanged. |
| 36 | 0x20 | Add the current entry to the running total | 0x24 | The running total becomes 14; flags unchanged. |
| 37 | 0x24 | Transfer to the count check | 0x0C | Unconditional transfer; registers and flags unchanged. |
| 38 | 0x0C | Compare the number of entries remaining with zero | 0x0E | Remaining count 0; Z=1, N=0, C=1, V=0; registers unchanged. |
| 39 | 0x0E | Transfer to the result instruction if no entries remain | 0x26 | Z=1: branch taken to result; flags and registers unchanged. |
| 40 | 0x26 | Copy the running total into the return register | 0x2A | Return register becomes 14; flags unchanged. |
| 41 | 0x2A | Return to the tagged link-register address | caller | Execution index is replaced with the valid tagged return address held in the link register. |

This trace contains **41 executed instruction occurrences**. It includes the four checks of the input words, the final fifth count check, and the unknown-entry branch that bypasses addition. The resulting return-register word is `0x0000000E` (14). Neither this hand trace nor the static disassembly establishes runtime acceptance, timing, or instruction-cache/prefetch behavior on a physical ARM processor. A genuine device run remains an outstanding test.

A distinct input sequence `0, unknown` would preserve the known zero, omit the unknown entry, and return zero. A sequence with no entries would take the branch from offset `0x0E` to offset `0x26` without loading any data. For a known word `0xFFFFFFFF`, the present representation cannot preserve the distinction between known and unknown; this case is intentionally excluded from the first contract.
