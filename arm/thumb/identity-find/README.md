# Find an identity by its number

The [English program](identity-find.english) searches a circular list from
[Eudyptula Task 12](../../../kernel/eudyptula/task-12/identity.c).
Each list pointer points at the link *inside* an identity. The lookup returns
the address of the whole identity or zero when it comes back to the sentinel.

In the ARMv7-A Thumb reference object, an identity occupies 36 bytes. The
four-byte signed ID starts 20 bytes from its beginning. The link starts at
byte 28 and contains two four-byte addresses, next and previous. The name
and busy flag do not participate in lookup.

The English function receives the sentinel address in r0 and the requested
ID in r1. It loads the first next-link address and tests it against the
sentinel before reading an ID. For each ordinary link, subtracting 28 gives
the containing identity. Adding 20 to that address locates the ID. Only a
miss reads the next link. The first matching ID wins, including when another
identity later in the list has the same ID. The return instruction branches
to the link register with the result in r0. The search neither allocates nor
frees an identity; returned addresses belong to the list owner.

The NDK-compiled C retains the original single argument and static sentinel.
Two relocations against `identity_list` fill the low and high halves of its
address. Its compiler combines the two ID address operations into
`ldr r3, [r2, #-8]`. On success it subtracts 28 to return the parent pointer.
The [English-generated assembly](generated-thumb.s) uses separate instructions.

The [execution check](../../../_/tests/identity-find/check.py) compiles the
imported structure and search function verbatim with freestanding definitions
of the required list operations, then links both functions into the same
static ELF. The reference uses this small list shim in place of Linux headers.
Unicorn runs five fixtures per function. It checks the result, order, width
and address of every non-stack data read, rejects writes outside the stack,
and records the address of every executed instruction. Wrong field offsets
and returning an embedded link are separate executable negative controls.

[Observed instruction and data traces](../../../_/evidence/identity-find/trace.txt)
and [reference disassembly with relocations](../../../_/evidence/identity-find/reference.disassembly)
come from NDK 27.2.12479018 and Unicorn 2.1.4. The CI job retains the objects,
linked ELF, disassembly and traces for a repeat run. The exercise covers
freestanding lookup on this one target. Linux module loading, allocation,
deletion and independent ai-ci acceptance remain separate.
