# Remove an identity by its number

The [English program](identity-destroy.english) takes the sentinel address in
r0 and the requested ID in r1. It calls the existing [lookup](../identity-find/).
A missing ID returns to the caller. If two identities share the requested ID,
only the first reachable one is removed.

The lookup returns the whole identity in r0. Its next link is at byte 28 and
its previous link is at byte 32. Both neighbor pointers address links inside
their respective identities or the sentinel. The program writes the predecessor
to the successor's previous field, then the successor to the predecessor's
next field. In a singleton both stores target the sentinel and close the ring.
It writes the fixture's retired-link markers (0x100 and 0x122) into the removed
link, then calls the fixture's release function with the identity's base
address. The two saved words keep the stack aligned across both calls.

The [execution test](../../../_/tests/identity-find/check_destroy.py) compiles
the original Eudyptula search and destroy bodies using a freestanding list
shim with those explicit marker values. For both functions it checks surviving
identities and both directions of the ring. At release, the callback validates
the exact object, its fields, the new ring and the retired links, then makes
that object's page inaccessible. It permits ordinary stack writes and the four
specific link destinations on a successful removal. A miss permits only stack
writes. Repeated removal runs on the same machine state.

The hosted execution workflow saves both the linked disassembly and a trace
with the actual instruction addresses, list writes and release calls.
This specimen covers removal and lifetime at the callback boundary. It
does not invoke the Linux allocator or assume a particular kernel's poison
configuration.
