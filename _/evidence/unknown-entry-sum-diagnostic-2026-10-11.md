# Diagnostic evidence: first unknown-entry sum (2026-10-11)

**Evidence level:** English source compiled to assembly by the new independent compiler; host-only ARM cross-assembly and static disassembly completed. NOT physical ARM execution, Android installation, maintained NDK stage, or independent AICI acceptance.

Host observed for this experiment: Linux x86_64, Node 22.16.0, Clang 17.0.0. The object was assembled using:

```sh
clang --target=armv7a-none-eabi -march=armv7-a -mthumb -c generated-thumb.s -o compiled-thumb.o
llvm-objdump -d --triple=thumbv7a compiled-thumb.o
```

Observed assembler output: **ELF32 little-endian ARM** object. The routine is **44 bytes long and has 14 instructions**. These are the disassembled halfwords, instruction offsets, and machine interpretations:

```text
0x00: f04f 0200       mov.w  r2, #0
0x04: f64f 7cff       movw   r12, #65535
0x08: f6cf 7cff       movt   r12, #65535
0x0c: 2900            cmp    r1, #0
0x0e: d00a            beq    0x26
0x10: f8d0 3000       ldr.w  r3, [r0]
0x14: f100 0004       add.w  r0, r0, #4
0x18: f1a1 0101       sub.w  r1, r1, #1
0x1c: 4563            cmp    r3, r12
0x1e: d0f5            beq    0x0c
0x20: eb02 0203       add.w  r2, r2, r3
0x24: e7f2            b      0x0c
0x26: ea4f 0002       mov.w  r0, r2
0x2a: 4770            bx     lr
```

Both short conditional branches and the unconditional backward branch assembled at the intended destinations. Six operations occupy two bytes and eight occupy four bytes. The remaining byte arithmetic is consistent with a 44-byte routine.

Eight Node tests of the compiler's allowed and rejected English sentences passed. A separate hand-derived account of all **41 instruction occurrences** for the input `4, 7, unknown, 3` reaches a return word equal to 14, but that calculation was NOT an executed native ARM run.

This diagnostic was made with LLVM Clang as an **investigative assembler**, not a substitute for a declared maintained Android NDK assembly/link stage. No claim is made about target ABI, device memory permissions, real hardware features or branch-prediction performance. A future receipt must bind the exact published source commit, source-to-assembly byte identity, assembler identity, target identity, and observed runtime behavior.
