# Create an identity at the front of the list

The [English procedure](identity-create.english) takes the sentinel, requested
ID, and address of the caller's name in r0, r1, and r2. It calls the existing
[lookup](../identity-find/) before requesting 36 bytes through the kernel
allocation adapter.

| Result in r0 | Effect |
|---|---|
| 0 | Initialize the new identity, link it at the front, and notify the caller. |
| 1 | The ID already exists. The allocator and name are untouched. |
| 2 | The allocator returned zero. The list and name are untouched. |

The procedure clears the 20-byte name field and copies up to 19 nonzero bytes.
Shorter names retain their zero padding. The ID starts at byte 20, the busy
flag is zero at byte 24, and the two link pointers start at byte 28. The
successor's previous link and the sentinel's next link both acquire the new
embedded link address. On success, the notification receives the requested
ID and the original name pointer, as the specimen's log call does.

The [test](../../../_/tests/identity-find/check_create.py) runs the original
pinned C creation body and the English-generated Thumb instructions on the
same sequence of IDs and names. The allocator supplies nonzero-initialized
memory. At notification the verifier inspects all stored names, IDs and busy
flags, and walks every list edge in both directions. It also checks the
return code, which calls occurred, the stack, and the callee-saved registers.
The ARM disassembly, linked ELFs, register-level execution addresses and
callback observations are saved by the repository's emulation workflow.

A successful call requires a valid name string. The C specimen defines no
general error result for a bad name pointer. A null pointer is tested only
on the duplicate and allocation-failure paths, where neither program reads
it. Allocation and log notification are freestanding callbacks in this test.
