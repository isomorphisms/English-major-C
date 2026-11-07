# Atomic A32 instruction parser in Idriç

This is a **separate ARMv7-A A32 assembly/disassembly parser**, not a replacement
for the existing English-sentence `DiscreteInterpreter.idric` and not a
complete ARM ISA decoder or executor. It reads GNU objdump lines containing
an instruction address, eight hexadecimal machine-word digits and a printed
assembly operation. It accepts an operation only when Idriç can construct
typed operands **and independently re-encode the same 32-bit word**.

## Complete target: the original 23 English QR entry sentences

The experiment's **entire accepted target** is the original 23 English
sentences in `_/experiments/qr-entry/ARM entry before its first call.english`,
corresponding to actual A32 words at byte offsets `0x0000`–`0x0058`
in `dqrls.armv7-a32.disasm.txt`.

The maintained `A32English.idric` parses each *English sentence*, constructs
one of the six existing typed full-English instructions and generates the
32-bit A32 machine word using `expected_machine_word`. It **does not** read
the original object words, disassembly mnemonics, or a lookup table to decide
which word to emit.

Run after building the canonical Idriç package:

```sh
build/exec/english-a32 --english '_/experiments/qr-entry/ARM entry before its first call.english'
```

For each sentence it emits `ENGLISH|source-line|original sentence` and
`WORD|decimal-byte-offset|eight-digit-hexadecimal-word|long-English-operation`.
It ends with `A32_ENGLISH_INSTRUCTIONS=23`. This makes the complete
English-to-machine mapping inspectable.

Acceptance is exactly **23 out of 23 byte-for-byte matches** against the
independently preserved original QR object words at the matching offsets;
the same emitted words must also pass the existing independent raw-word
Idriç decoder. A valid changed operand must change the emitted machine
word (not yield an archived constant). Invalid register roles, out-of-range
immediates, reordered stack registers, altered operation meaning, and
unrecognized English sentences must be rejected. All checks must execute
the compiled Idriç binary at the exact PR head.

**Stop here when accepted.** The next relocated call at `0x005c`, the
remaining QR instructions, the full ARM architecture, runtime execution of
newly emitted words, and general language support are **out of scope**.
Existing broader ARM/Fortran work is separate and is not a prerequisite for
this bounded English-to-machine experiment.

## Atomic register and instruction identities

`A32Atoms.idric` declares sixteen distinct singleton types, `r0` through
`r15`, rather than an enumeration whose alternatives share one register type.
`a32_register` is a tagged union of those atom types; narrower choices
`a32_data_register`, `a32_non_pc_register`, and `a32_stack_member`
admit particular register roles. These subset types are intentionally **more
restrictive than the complete A32 architecture**: special PC/SP encodings
will get their own instruction forms instead of being guessed here.

Aliases `sb`, `sl`, `fp`, `ip`, `sp`, `lr` and `pc` refer to the
same physical register as `r9`–`r15` respectively; alias spelling is not
another physical register type.

Each permitted operation form also has its **own singleton opcode type**.
`a32_instruction` then constructs only the operand shapes associated with
those opcodes: registers, base register and unsigned immediate offset, a
nonempty push-register list, or an immediate shift. The original source text and one-based line number are
retained separately from the typed instruction. The machine word and address are
retained as separate listing evidence, not an executable value.

A production type-indexed instruction family can later replace the closed
`a32_instruction` union. This initial implementation already prevents
constructing one instruction form with another form's opcode type.

## Deliberately admitted A32 subset

| Opcode atom | Printed GNU mnemonic | Exact admitted encoding form |
| --- | --- | --- |
| `form_for_storing_selected_register_values_below_stack_pointer_with_stack_pointer_writeback` | `push {…}` | A32 STMDB SP!, nonempty distinct register list, excludes SP/PC |
| `form_for_copying_thirty_two_bit_register_contents_without_changing_condition_flags` | `mov Rd, Rm` | A32 register, no shift, no flag update |
| `form_for_loading_thirty_two_bits_using_base_plus_unsigned_immediate_without_base_writeback` | `ldr Rt, [Rn, #imm]` | A32 positive unsigned 12-bit offset, preindexed, no writeback, word transfer |
| `form_for_storing_thirty_two_bits_using_base_plus_unsigned_immediate_without_base_writeback` | `str Rt, [Rn, #imm]` | Same immediate/addressing form; store word |
| `form_for_subtracting_unrotated_eight_bit_immediate_without_changing_condition_flags` | `sub Rd, Rn, #imm` | A32 immediate, unrotated 0–255, no flag update |
| `form_for_clearing_bits_selected_by_sign_extending_right_shift_without_changing_condition_flags` | `bic Rd, Rn, Rm, asr #shift` | A32 register mask, arithmetic right shift 1–31, no flag update |

All six are currently **AL/unconditional forms**. The fixed `0xE`
condition nibble is checked through independent word reconstruction.
Other condition suffixes, rotated immediates, literal loads, PC writes,
bit operations, VFP/NEON, exceptions, branch/return instructions, relocations
and Thumb encodings are **not** claimed to be understood.

`push` is the printed alias of the A32 STMDB SP!, register-list encoding.
It has a distinct typed atom for the documented source-level operation,
while `expected_machine_word` reconstructs the actual A32 encoding.

## Source and acceptance

- Real source fixture:
  `arm/a32/r-qr/dqrls.armv7-a32.disasm.txt`.
- First accepted prefix: instruction offsets `0x0`–`0x58` inclusive,
  **23 actual saved four-byte A32 words**. The following `BL` at `0x5c`
  with its linker relocation is intentionally rejected by this version.
- `test-a32.mjs` invokes **the Idriç-compiled executable** on this prefix;
  it checks all 23 expected normalized instructions and rejects altered raw
  words, altered operands, illegal register roles, duplicates, overlarge
  offsets, unimplemented shift forms and unknown branch instructions.
- List-section headings, object headers and symbol headings are classified; explicit
  `R_ARM_CALL` annotation rows and `.word` lines are not executed. Every accepted record retains
  its original line number and text. `--with-source` exposes these records.
  Unknown records fail closed instead of silently losing input.
  This is **not** complete byte/section accounting. That remains owned by
  the separate ARM inventory and relocation audit.

The existing exact-head workflow builds with canonical Idriç revision
`2734ac5a86610eddfab73b1644d72b4ac85a65ee`. The reproducible Kitchen/Ike
qualification route is tracked with the assignment in Flexible Pipes issue 228.

The GitHub Actions workflow pins the Idriç source revision
`2734ac5a86610eddfab73b1644d72b4ac85a65ee`, bootstraps and runs its
existing compiler smoke before attempting the parser build. Until that exact
workflow completes, the Idriç parser **must not be described as compiled or
executed**. Even a passing host run establishes only parsing/encoding checks;
it does not execute ARM code or provide independent AICI acceptance.

## Completion boundary

The 23 original sentences and six attested A32 encoding forms are sufficient
for this experiment. Do **not** extend parsing, encoding or interpretation
to the relocated call or further QR/ARM instructions merely to increase
instruction coverage. Preserve the real original words and all rejection tests.

A correctly encoded word is not automatically an independently executed
instruction. Report direct English→word exact matches, compiled Idriç binary
tests and machine execution as **distinct** evidence levels.
