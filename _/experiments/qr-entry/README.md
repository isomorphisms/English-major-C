# Executable English for the actual QR entry instructions

This experiment advances beyond a byte-alignment check. It interprets two
ordinary-English machine programs, executes the corresponding original
`dqrls` instruction bytes in QEMU, and compares their states after every
instruction. The English interpreter does not consult assembly mnemonics
when deciding an operation's effect. Machine execution does not use the
English interpreter's result as an oracle.

The ARM source is [ARM entry before its first call.english](../../../arm/a32/r-qr/ARM%20entry%20before%20its%20first%20call.english).
The x86 source is [x86 entry before its first call.english](../../../x86/r-qr/x86%20entry%20before%20its%20first%20call.english).
These files implement **only the entry prefixes**, not whole QR solvers.
Long comments beginning `(NOTE: ...)` are inert. Unrecognized executable
sentences, missing instruction offsets and undeclared registers fail.

## What actually executes

The machine side reads `.text` directly from the original pinned ELF
objects already in this repository. No replacement Fortran/C function is
compiled; no assembler regenerates the instructions. A small diagnostic ELF
load envelope embeds those unchanged bytes and a declared scratch-memory
region. It exists solely to let QEMU load and single-step these captured
instructions. It is not the original linked executable, an Android app,
or a production ICK/NDK build.

GDB issues one machine step at a time. After each step it records all
16 integer registers and the execution index on x86, or R0–R15 on ARM;
it records condition status and all **12 KiB of the declared workspace**,
including incoming and outgoing stack arguments. The independent English
state is compared against every captured register and workspace byte.
On x86, comparisons exclude auxiliary carry after TEST/XOR because the
architecture leaves that flag undefined; other defined arithmetic flags
remain checked. ARM checks NZCV and instruction-set state. SIMD/VFP state
and unspecified status bits are outside this comparison.

The ARM prefix ends immediately before object offset `0x005c` (`BL`).
The x86 prefix ends immediately before object offset `0x0075` (`CALL`).
Neither unlinked relocation placeholder is executed. At the stop, the
nine by-reference arguments must be exactly `x,n,n,p,tol,k,qraux,jpvt,work`
in the appropriate registers and stack slots of that architecture.
The earlier manual walkthroughs are not treated as observed traces.

## Cases and deliberate errors

The initial dimension pairs are `(6,2)`, `(0,0)`, `(-3,2)`, `(6,-2)`,
`(-3,-2)`, `(INT32_MIN,INT32_MAX)`, and `(INT32_MAX,INT32_MIN)`.
Negative dimensions are **instruction-semantics probes**, not a claim
that the full Fortran routine accepts such dimensions. The experiment
never calls the routine beyond the entry prefix. Distinct register and
memory sentinels expose accidental truncation and stack-write mistakes.

For each architecture the experiment also changes a valid native
instruction while keeping the English source fixed, then changes a valid
English sentence while keeping the original native bytes fixed. A negative
test succeeds only on an explicit **state mismatch**. Missing emulators,
debugger failure, timeout, absent traces and parsing errors are not accepted
as successful rejection. A separate interworking mutant falsely retaining
Thumb state must also be rejected.

## The linked ARM image is not uniformly A32

`elf-evidence.mjs` reads the original linked image's **ELF mapping symbols**
`$a`, `$t` and `$d`, independently of mnemonic spellings. It compares each
printed instruction/data byte against the ELF section, checks the actual
Thumb leading-halfword length rule, rejects code/data disagreement, and
accounts for every executable-section byte, including unprinted gaps.
The resulting JSON and TSV retain addresses, modes, bytes and sequential
successors. Those successors are not represented as the actual destination
of a taken branch or a load into PC.

A separate execution witness uses the *actual* four Thumb bytes at
linked address `0x940`: `ff f7 74 ee`. The encoded BLX displacement must
resolve to A32 address `0x62c`. QEMU must make that transition, clear CPSR.T,
and preserve the tagged Thumb return address in LR. The source bytes are
rebased together in the diagnostic mapping, so the relative displacement
is unchanged. The called library is never executed.

The exact mapping-symbol rules are documented by Arm's ELF32 ABI:
https://github.com/ARM-software/abi-aa/blob/2025Q1/aaelf32/aaelf32.rst
QEMU's debugger interface is documented at:
https://www.qemu.org/docs/master/system/gdb.html
GDB's machine-step/register/memory protocol is documented at:
https://sourceware.org/gdb/current/onlinedocs/gdb.html/Packets.html
The ABI/ISA claims still refer to ARMv7-A DDI 0406C.d and the captured
x86-64 instruction encodings, not merely to mnemonic names.

## Running and interpreting evidence

From the repository root, with Node 18 or newer, `qemu-arm`,
`qemu-x86_64`, and `gdb-multiarch` available:

```
node _/experiments/qr-entry/check-machine-execution.mjs OUTPUT_DIRECTORY
```

The workflow runs on an exact PR-head checkout and records tool versions.
It uploads the English/machine comparison receipt, per-step state dumps,
initial memory, diagnostic ELF images, debugger logs and complete linked
mode map. These files show exactly what was executed; source presence or
workflow creation alone is not a passing result.

This is **not a general English Major C interpreter**. Its parser accepts
the specific instruction sentences needed by the two prefixes. It does not
validate QR arithmetic after the first call, floating-point rounding,
external BLAS behavior, fault/exception ordering, all architectural input
states, or a complete linked-image English translation. A successful run
establishes observed normal-completion agreement for these instructions and
these explicit initial states. The existing independent numerical QR
smokes and raw archives remain separate evidence.
