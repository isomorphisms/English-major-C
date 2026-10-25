# EMC-3: a false conditional move still clears the upper half

Purpose: independently test the archived x86-64 instructions, starting from
machine state rather than the Fortran algorithm or the annotation generator.

The audited input is translation commit
`df120963a76ad9e2587ef8ea87ad26bd958d80c5`. The audit does not modify its
concordances. A passing byte crosswalk is a different predicate from a correct
description of the instruction's state changes.

## Values and signatures

- A whole-register payload is exactly 64 bits; the selected low half is 32 bits.
- `false_conditional_move_result : whole_register_bits → whole_register_bits`
  preserves bits 31..0 and clears bits 63..32 in x86-64 long mode.
- A raw-byte witness takes specified registers, memory, flags and MXCSR and
  checks specified postconditions. Instruction fetching, execution, memory
  access and Linux reporting are effects. Undefined flag bits are not compared.
- Four distinct archived 32-bit conditional-move encodings have both taken
  and untaken tests. The eight concordance occurrences include four repeats
  in the linked executable; they are not eight distinct encodings.
- Source and destination may alias. No general input-domain equivalence proof
  is inferred from these finite witnesses.

## Idriç slice and boundary

`false-conditional-move.idric` expresses the pure bit-pattern rule using the
canonical compiler's documented source vocabulary. Checking is attempted with
the canonical `edric --emit-one-step` entrypoint at compiler revision
`2734ac5a86610eddfab73b1644d72b4ac85a65ee`.

The requested independent boundary is actual execution of the archived x86
machine bytes. The Idriç model cannot by itself prove that boundary. The
separate assembly witness executes those bytes directly and checks independent
expected states; it is diagnostic assembly, not an EMC frontend or a maintained
compiler replacement. No Python or JavaScript verifier is introduced.

## Result

The first invocation supplied three positional values and returned the usage
error. The corrected command used `edric --emit-one-step SOURCE -o ARTIFACT`.
It exited 2: `Idriç one-step emitter: compiler is not bootstrapped`.
No grammar, typechecking or Idriç execution success is claimed.

The diagnostic assembly passed 22 cases on native x86-64 Linux (AMD EPYC under
KVM). Cases 1..9 and 11..22 use archived instruction bytes. Case 10 is an
explicit register-register MOVSD contrast control absent from the archive.
Compiling the same witness with `OLD_FALSE_BRANCH_CLAIM=1` exited 1 at case 1;
the original whole-register false-branch claim is thereby rejected.

`verify-audit.mjs` is a narrowly scoped Node fallback for filesystem access,
GNU objdump decoding, launching the native byte witness and checking the
complete TSV record inventory. The current environment cannot check even the
pure Idriç slice because the canonical compiler is not bootstrapped. This
fallback's passing results are not Idriç or EMC execution.

The fallback accepts pinned raw archives and a 2,835-row audit inventory. It
must preserve widths, bytes and row identity, reject altered verdicts and
missing records, and reject the legacy semantic oracle. No record is promoted
to full semantic acceptance by a structural match.

## Language work exposed

The smallest useful future Idriç handoff is a checked fixed-width register
transition plus a native x86 backend harness that executes an explicitly
identified instruction-byte specimen and returns pre/post state. Acceptance
must reject the old false-branch claim that the whole register is unchanged.
