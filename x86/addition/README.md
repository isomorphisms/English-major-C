# The same unknown-entry sum, implemented for x86-64

This is a second real machine target for the original
[ARMv7-A Thumb English Major C specimen](../../arm/thumb/addition/README.md).
Both calculate an integer result from a finite sequence of four-byte words,
omitting a reserved `0xFFFFFFFF` word, summing known words modulo `2^32`.
The common task is **not** R's full NA/NaN semantics or R's QR least-squares
implementation. There are two source programs because physical registers,
calling conventions, instruction encodings, flags and return operations are
different: pretending these are the same machine instruction would be wrong.

## x86-64 English source and exact machine representation

- [English source](An%20unknown%20entry%20is%20omitted%20using%20x86-64%20instructions.english):
  14 executable sentences and three labels, with long, explicit English
  descriptions of the machine's actions.
- [Corresponding x86-64 assembly](generated-x86-64.s): emitted from the
  separate [narrow x86-64 compiler](../../_/tools/compile-english-x86-64.mjs).
  Each source sentence maps to exactly one machine instruction for this
  deliberately restricted example. The compiler rejects unrecognized
  sentences, unresolved/duplicate labels, unapproved physical registers,
  incorrect calling-register assignments and wrong instruction count.
- [ARM Thumb counterpart](../../arm/thumb/addition/generated-thumb.s) is unchanged
  and continues to be generated from its [own English source](../../arm/thumb/addition/An%20unknown%20entry%20is%20omitted%20from%20an%20addition.english).

## Declared x86-64 machine and ABI

The test routine `add_all_known_entries_x86_64` receives a pointer to the
first four-byte input word in **RDI** and a nonnegative, 32-bit input count
in **ESI**, and returns the 32-bit result in **EAX**. It uses caller-save
registers **RDX** for the running total, **RCX** for the current word,
and **R8D** for the all-ones unknown marker. The caller follows a restricted
System V AMD64 register/call convention; the NDK-produced test binary uses
only bare Linux kernel exit syscalls, no libc. Inputs must describe a readable
aligned contiguous range and a count no greater than `2^31 - 1`.
The word representation is little-endian. Nothing writes the input words.

The two initial x86 instructions use `mov edx, 0` and `mov r8d, 65535`,
which do **not** change flags. The next instruction uses
`or r8d, 0xffff0000` to construct `0xffffffff` and **does update**
the x86 condition flags. The next `cmp esi, 0` overwrites the relevant
branch flags, so this difference from Thumb's flag-preserving `movt`
does not change the defined result of the example.

`lea rdi, [rdi + 4]` advances the pointer without reading memory.
`lea esi, [rsi - 1]` decrements the count; writing ESI zero-extends
the stored 64-bit RSI register. `lea edx, [rdx + rcx]` computes an
address expression as fixed-width arithmetic, discards all but the
low 32 bits, stores in EDX and does **not** alter flags. We choose LEA
instead of an ADD that might overwrite the condition flags. The
unknown-marker comparisons use `cmp` and `je` with explicit zero-flag
conditions. On return `mov eax, edx` supplies the result; x86 `ret`
pops a return instruction address from the machine stack.

The ARM program instead receives the word pointer in R0, count in R1,
returns in R0, and branches to LR for return. **A return-through-LR
operation is not itself an x86 instruction.** The two concrete
representations are semantically comparable at the function interface
but not bitwise-identical internal instruction traces.

## Six shared concrete cases

| Words | Expected 32-bit answer | Why |
| --- | ---: | --- |
| `[4,7,0xffffffff,3]` | 14 | Omit one unknown word |
| Zero entries | 0 | No memory reads from a zero-length input |
| `[0xffffffff,0xffffffff]` | 0 | Every entry is unknown |
| `[0,0xffffffff,5]` | 5 | Known zero must remain distinct from unknown |
| `[0xfffffffe,4]` | 2 | Sum wraps modulo `2^32` |
| `[0xffffffff]` | 0 | Single unknown entry |

The two separate assembly-level test harnesses under
[tests/emulation](../../_/tests/emulation) make precisely these checks.
The emulation workflow uses QEMU in Linux user mode, with a
freestanding static ELF compiled/linked by a pinned Android NDK.
The ARM test entry is A32 and interworks with the original T32
function, while x86-64 runs its own assembly and test entry.
This tests execution of the actual assembled machine instructions,
not a JavaScript lookalike or a hand-computed trace.

## Reproducibility and limitations

From the repository root, with Node 22:

```sh
node _/tools/compile-english-x86-64.mjs \
  'x86/addition/An unknown entry is omitted using x86-64 instructions.english' \
  /tmp/english-x86-64.s
cmp /tmp/english-x86-64.s x86/addition/generated-x86-64.s
node --test _/tests/compile-english-assembly.test.mjs _/tests/compile-english-x86-64.test.mjs
```

Hosted QEMU status, target compiler version, machine disassembly, traces,
negative-mutant outcomes, and exact-head SHA must be read from the
[emulation workflow](../../.github/workflows/emulate-english-arm-x86.yml)
rather than inferred merely because the workflow exists. This first
example does **not** prove general x86-64 frontend coverage, full ISA
semantics, QR numerical equivalence, dynamic BLAS execution, Android
device installation or independent ai-ci acceptance.

## Relationship to the QR work

The [historical R QR x86-64 disassembly](../../_/captures/r-lm-native-x86-64/README.md)
and its [English translation draft PR #7](https://github.com/dilapidated-shed/English-major-C/pull/7)
are a different, substantially larger experiment. [Draft PR #8:
Capture R lm QR routines as actual ARMv7-A A32 disassembly](https://github.com/dilapidated-shed/English-major-C/pull/8)
develops the parallel ARM QR evidence separately. A compiler for this
14-instruction summation does not thereby support ARM or x86
floating-point QR procedures.
