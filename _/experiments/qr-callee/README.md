# Executable English through the first QR call

This extends the [entry-prefix experiment](../qr-entry/README.md), rather
than replacing its previously checked machine bytes or grammar. It starts
at the original `dqrls` entry, actually executes its call into `dqrdc2`,
and interprets `dqrdc2` initialization until its first `dnrm2` call. For
nonpositive dimension probes it instead stops immediately at the taken
guard's target. No BLAS body, substitute norm, QR factorization result,
or full routine return is supplied by the interpreter.

## Independent descriptions and execution

`Call boundaries.english` specifies the architecture-specific call:
ARM saves the next instruction address in LR; x86 pushes that eight-byte
address onto its descending stack. The two factorization `.english`
files spell out register, memory, flags, bit shifts, literal addresses,
and floating payload transfers. `callee-state.mjs` extends the existing
English meanings. It never selects an operation by inspecting an assembly
mnemonic. Unknown sentences and unmapped execution destinations fail.

The machine side extracts the checksum-pinned caller and callee `.text`
from the existing original objects. No compiler or assembler generates
replacement instructions. A diagnostic loader places caller code at
`0x11000`, callee code at `0x12000`, and original callee `.rodata` at
`0x14000`. Unlike the earlier entry-only experiment, this version must
resolve relocations before executing a real call. Exactly two four-byte
fields per architecture are resolved in the diagnostic copy:

- ARM `R_ARM_CALL` at caller offset `0x5c`, and `R_ARM_REL32` at callee
  literal offset `0x6f8`.
- x86 `R_X86_64_PLT32` at caller displacement offset `0x76`, and
  `R_X86_64_PC32` at callee displacement offset `0xc4`.

The object relocation's actual type, symbol and addend must agree with
the expected reference. The caller's decoded patched target is checked.
Every other copied code byte is compared with the original. Original
objects and disassemblies remain unchanged. Receipts retain both the
old and relocated bytes. This is a narrowly linked diagnostic image,
not the complete original linked executable. Other unresolved external
relocations are not reached and are not claimed to be resolved.

For positive dimensions, both procedures must reach the first norm
boundary with the pointers `(n, first matrix column, increment)` in their
actual ABI registers. The increment points to the original read-only
four-byte integer `1`. ARM stops at `dqrdc2+0xac`; x86 stops at
`dqrdc2+0xdb`. Taken dimension guards stop before any further instruction
at their explicitly named target.

## State comparison after every actual instruction

Compare every general-purpose register and the execution index, defined
integer flags, the entire 12,288-byte workspace, **all 32 ARM D registers
or all 16 x86 XMM registers**, and FPSCR or MXCSR. Floating registers are
compared as raw 64/128-bit payloads, not decimal floating values.
The diagnostic initializes negative zero, subnormal and finite payloads,
and quiet NaNs with nonzero payloads; rounding-control settings vary.
Initial-state readback must itself match the declared bits. This prevents
GDB conversion or NaN changes from being mistaken for a successful test.

The path includes ARM VPUSH of D8–D11 and loading the exact binary64
constant one into D8, and the x86 store of XMM2's low 64 bits to its stack.
These are floating-register **storage and constant** semantics. They are
not yet floating addition, multiplication, square root, NaN propagation,
trap handling or complete VFP/SSE arithmetic semantics.

Nine dimension pairs are `(6,2)`, `(1,1)`, `(4,3)`, `(0,0)`, `(-3,2)`,
`(6,-2)`, `(-3,-2)`, `(INT32_MIN,INT32_MAX)`, and
`(INT32_MAX,INT32_MIN)`. Nonpositive dimensions probe instructions and
guard branches only; they do not establish valid full-QR input behavior.
The three positive pairs run through initialization to the norm boundary.

Each architecture has three deliberately incorrect experiments: a valid
changed native instruction, a valid changed English floating-register
storage sentence, and a wrong relocated call destination. A mutation must
produce an explicit compared-state mismatch. A debugger error, timeout,
missing file, signal or malformed record does not count as that rejection.

## Running

With Node, QEMU user-mode ARM/x86 and GDB multiarch available:

```
node _/experiments/qr-callee/check-callee-execution.mjs OUTPUT_DIRECTORY
```

The workflow records the actual source head and program versions, and
retains each instruction's memory dump, raw FP payloads, register state,
comparison receipt, diagnostic ELF, debugger commands/logs and an exact
source snapshot. The shared entry-prefix test remains separate and runs
unchanged. Passing results must be read from the exact-head run; the
existence of these files is not evidence that they executed successfully.

The previously missing softfp verifier is recovered by integrating the
unchanged parent evidence revision `d567d6d9`, not by suppressing its check.
That separate numerical softfp experiment is still not execution of this
English model or a substitute for instruction-level semantic comparison.

## References and next boundary

GDB's documented `dump binary value` and `append binary value` commands
preserve register payloads without converting them to decimal numbers:
https://sourceware.org/gdb/current/onlinedocs/gdb.html/Dump_002fRestore-Files.html

ARM ELF relocations: AAELF32, 2025Q1, section on static relocations:
https://github.com/ARM-software/abi-aa/blob/2025Q1/aaelf32/aaelf32.rst

The next unresolved call is `dnrm2`, followed by QR normalization,
Householder arithmetic and the remaining BLAS/runtime boundaries. This
experiment does not claim their meanings or results. Fault ordering,
unsupported instruction modes and all-input equivalence remain outside
this bounded normal-completion comparison.
