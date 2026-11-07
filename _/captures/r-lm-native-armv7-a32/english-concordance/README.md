# ARMv7-A A32 QR instructions written in inspectable English

**Status:** first-pass **machine-address concordance**, not an executable
English Major C numerical program or a verified ARM instruction interpreter.
This is a second architecture-specific reading of the *same three R Fortran
source routines* whose authentic historical x86-64 objects and English
concordance are in [draft PR #5](https://github.com/dilapidated-shed/English-major-C/pull/5)
and [draft PR #7](https://github.com/dilapidated-shed/English-major-C/pull/7).
This draft is stacked on [PR #8 — Capture R lm QR routines as actual
ARMv7-A A32 disassembly](https://github.com/dilapidated-shed/English-major-C/pull/8).
Work-control intent: [Flexible Pipes #102](https://github.com/isomorphisms/flexible-pipes/issues/102).

## What is counted and preserved

| ARM raw object | A32 instruction words | Data words in literal pools |
| --- | ---: | ---: |
| `../dqrls.armv7-a32.disasm.txt` | 131 | 1 |
| `../dqrdc2.armv7-a32.disasm.txt` | 442 | 5 |
| `../dqrsl.armv7-a32.disasm.txt` | 576 | 10 |
| **Total** | **1,149** | **16** |

All 1,149 printed machine instructions are paired with their exact ARM
encoded 32-bit word, object-relative byte address, original GNU disassembly,
long English operation name, the known four-byte sequential successor,
architectural condition predicate, and original relocation (if present).
The **16 `.word` literals are never masqueraded as operations**. An
ellipsis printed by GNU objdump indicates omitted/padding bytes; that
unprinted region is recorded as an explicitly unresolved range and must
not be silently decoded from thin air. Actual ELF object bytes remain
in the underlying archive, and their original SHA-256 ledger remains
unchanged by this translation branch.

The object files are **not complete executables**. Calls to BLAS and other
linked libraries are relocation-bearing external boundaries, not evidence
for instructions inside those libraries. These are cross-compiled
GNU/Linux ARM EABI/softfp objects, not Android app or R interpreter builds.
The historical build used cross GNU Fortran 14.2.0 and GNU objdump 2.42;
no maintained-project ICK/NDK toolchain exception is inferred.

## Machine-first semantics

Read [What the recorded A32 machine actually contains.english](../../../../arm/a32/r-qr/english/What%20the%20recorded%20A32%20machine%20actually%20contains.english)
before the three concordance files. That machine contract distinguishes:
R0–R15, SP/LR/PC aliases, ARM-state PC operand reads at instruction
address plus eight, A32 four-byte instruction fetch, APSR NZCV,
instruction predicates, VFPv3-D16 D registers/FPSCR, multiple-word
register and stack transfers, and interworking/return variants.

The three translation ledgers correspond to these original artifacts:

- `dqrls.armv7-a32.instructions.english`
- `dqrdc2.armv7-a32.instructions.english`
- `dqrsl.armv7-a32.instructions.english`

Each record's English sentence is **preliminary** and can omit
architectural corner cases. Structural verification proves that no
printed original machine instruction, literal or relocation disappeared;
it does **not** independently establish that a sentence matches the
entire ARM DDI instruction semantics. In particular VFP NaNs, denormals,
rounding, exception flags, memory faults and precise subword address
effects need independent validation.

## Why two instruction sets are retained

The x86-64 specimen and the ARM A32 specimen were generated from
the same three Fortran numerical routines by different compilers/targets.
Their machine code, register allocation, flag dependencies, call-stack
layouts and VFP/SSE instructions are NOT expected to match byte-for-byte
or even instruction-for-instruction. A later equivalence test must
identify a meaningful observable boundary, such as the same input
matrices and output coefficients, and account for floating-point
rounding and BLAS implementations. **Do not manufacture an ARM instruction
for every x86 operation** or vice versa. Language-level interpretation
may eventually connect them through checked state effects and explicit
interfaces, but this draft is deliberately bottom-up.

The separate [draft PR #9 — Run English Major C on both ARM Thumb and
x86-64 machines](https://github.com/dilapidated-shed/English-major-C/pull/9)
demonstrates QEMU execution of the much smaller unknown-entry summation.
It is **not execution of these QR instructions**. The ARM QR routines
have not yet been run as complete numerical programs.

The [first actual A32 QR call traced in long English](../../../../arm/a32/r-qr/english/How%20the%20real%20A32%20machine%20prepares%20its%20first%20QR%20call.english)
derives the nine dqrdc2_ pointer arguments instruction by instruction,
including precise AAPCS32 incoming and outgoing stack offsets. It
cross-checks Fortran only *after* deriving the actual machine effects.

## Linked ARM executable contains mixed A32 and Thumb instruction states

The separate [linked ARM Linux hardfp QR archive](../../r-lm-native-armv7-linux-hardfp-linked/README.md)
does include a numerical QEMU execution of the Fortran routines. Its
`linked-executable.armv7-hardfp.disasm.txt` is **not** another uniformly
four-byte A32 listing. The runtime startup region around `_start`
includes Thumb instructions: for example `0x924: bc02 pop {r1}`
(2 bytes) and `0x91c: f04f 0b00 mov.w fp,#0` (4 bytes).
It also includes a `blx` instruction that changes instruction-set
state while crossing the target boundary.

Consequently a full English-machine translation of the **linked**
numerical execution must decode **both A32 and T32**, track CPSR.T
(ARM-versus-Thumb instruction state), decode two- versus four-byte
Thumb encodings correctly, and represent branch/interworking effects.
It must not copy this fixed A32 `+4` sequential-successor rule onto
the Thumb startup code. Moreover the linked test's **hardfp** ABI
is not interchangeable with the unlinked softfp A32 archive covered
by these three ledgers. These are explicit follow-on obligations,
not silently covered by the 1,149 instruction records above.

## Acceptance limits

`verify-arm-English-concordance.mjs` verifies the English ledgers against
original source SHA-256, encoded words, record sequence and address,
the original GNU mnemonic/operands, separate data records, relocation
membership, and explicitly recorded omitted gaps. Negative mutations
must fail. CI should bind checkout to the **exact PR head**, not GitHub's
synthetic merge checkout. No semantic oracle, execution-index trace,
BLAS closure, hardware execution or independent ai-ci/Flexible Pipes
promotion is claimed by these source-format tests.

The numerical operation is ordinary `lm()`'s **squared vertical residual**
least squares. It is not the separately proposed unsquared perpendicular-
distance line fit from [English Major C issue #4](https://github.com/dilapidated-shed/English-major-C/issues/4).
