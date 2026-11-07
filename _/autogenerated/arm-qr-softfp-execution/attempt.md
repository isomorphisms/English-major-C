# EMC-2: execute the already archived softfp objects

This is a historical machine-inspection experiment using the task's explicit
GNU Fortran ARM specimens. It is not a maintained production compiler choice.

Inputs are the three exact original A32/softfp ELF objects, the unchanged R
Fortran input files and C caller, five independently pinned reference BLAS
procedures, and a soft-float Linux C runtime. Outputs are an identified linked
ELF, complete static disassembly, numerical observations, and a bounded QEMU
pre-instruction register/FP-state trace.

## Type and effect sketch

- An instruction address is an ARM byte address, not a trace-row number.
- Each original object has an identity and a relocation-bearing code payload.
- Linking relocates calls and data references. Unrelocated payload bytes must
  remain identical; executable addresses and trace states belong to that ELF.
- A numeric observation has one rank and three finite IEEE binary64 values:
  intercept, slope and squared vertical residual sum. Finiteness is part of
  acceptance, not merely a formatting property.
- The independent sample oracle is rank 2, 17/21, 33/35 and 134/105.
- File reads, compiler/link invocations, subprocess execution and trace capture
  are actions. Idriç's pure finite-payload predicate is a separate function.
- QEMU Linux execution cannot establish Bionic, MIRO A1 or physical execution.

## Idriç attempt

The canonical compiler revision is
`2734ac5a86610eddfab73b1644d72b4ac85a65ee`. The pure
`finite-double-payload.idric` uses a named exact 64-bit payload and the all-ones
exponent exclusion. Checking through `edric --emit-one-step SOURCE -o ARTIFACT`
was attempted against this source and returned exit 2:
`Idriç one-step emitter: compiler is not bootstrapped`.
No source grammar/typechecking or Idriç execution success is claimed.

The Node fallback `verify-softfp-execution.mjs` is bounded to this evidence
package. It checks hashes, unrelocated linked QR bytes, the numeric oracle and
actual QEMU execution. The first blocker for replacing it with checked Idriç
is the unavailable bootstrapped compiler; later work must qualify filesystem,
subprocess and ELF-byte inspection on its direct host backend. The acceptance
test must reject NaN/Infinity, altered artifacts and an absent instruction trace.
