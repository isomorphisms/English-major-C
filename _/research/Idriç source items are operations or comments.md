# Idriç experiment: a source line may be an operation, a comment, or a declaration

**Status:** source-model proposal only. The adjacent [Idriç declarations](EnglishMajorC/SourceCategories.idric) have been committed for inspection but **have not been compiled by Idriç**. They are not a working lexer, English parser, or replacement for the small JavaScript prototype. No change to ICKY or Idriç's core compiler is made in this experiment.

## Why this is smaller than a language-wide type system

The first English Major C program needs only to distinguish what each piece **does in the source**:

- an **executable operation** requests precisely one permitted machine instruction;
- a **nonexecuting comment** retains source text but cannot emit an instruction;
- a **nonexecuting explanation** retains a reason or tradeoff, likewise cannot emit an instruction;
- a **register-name declaration** associates a physical register with a descriptive English name;
- an **instruction-name declaration** marks an exact permitted instruction boundary;
- a **machine-target declaration** names the one chosen architecture.

These are kinds of **source items**. They do not require language-level numeric types, floating-point types, R missing-value semantics, or a permanent choice of how `unknown` is represented.

Idriç already has storage-neutral `choice ... one_of` syntax for a closed set of alternatives in `.idric` source. It is a plausible place to model this distinction. For example, the model declares:

```idric
choice english_source_item one_of
  machine_target_declaration Text
  executable_operation permitted_machine_operation
  nonexecuting_comment Text
  nonexecuting_explanation Text
  register_name_declaration Text Text
  following_instruction_name Text
```

`permitted_machine_operation` is a second **closed set** of the instructions needed by the first unknown-entry example: comparisons, four-byte loads, additions and subtraction that preserve flags, direct control transfers, explicit marker construction, register copy, and return through the link register. This is a proposed typed description, not a transcription of all ARM machine operations.

## How the first actual sentences should become source items

| English Major C source sentence | Proposed structured result |
|---|---|
| `This program uses ARMv7-A Thumb instructions.` | `machine_target_declaration` with the selected target |
| `Name register two "running total".` | `register_name_declaration` with physical register two and English name running total |
| `Name the following instruction "check whether any entries remain".` | `following_instruction_name` with that name |
| `Add "current entry" to "running total" and keep only the lowest thirty-two result bits without changing the condition flags.` | `executable_operation` containing `add_named_register_contents_without_changing_flags` with its two named operands |
| `Compare "current entry" with "unknown marker" and update the condition flags.` | `executable_operation` containing `compare_two_registers_and_update_flags` |
| `(NOTE: Unknown currently means a reserved marker, not an inaccessible memory location.)` | `nonexecuting_comment`, preserving exact words |
| `(WHY? BECAUSE: This first version tests the branch-over-addition strategy.)` | `nonexecuting_explanation`, preserving exact words |

The two parenthesized lines are **proposed** source conventions; neither is part of the existing executable example's accepted grammar.

The `Text` operands in the type sketch are **placeholders at the syntax boundary**. They are not permission to emit assembly from arbitrary text. Semantic checking must still establish which physical register or exact instruction a name denotes, distinguish source-word order from target register order, validate operands, and enforce branch destinations, condition flags, execution-index effects, address validity and the closed ARM T32 instruction grant. Once those questions become concrete, narrow named operand types may be useful. Do not build them before they are needed.

## What ICKY can do today

ICKY's current scanner/parser (observed in `dilapidated-shed/icky`, `src/Scan.idr` and `src/Parse.idr`) handles simple names, natural numbers, grouping, newlines, and a small glyph set. Its scanner rejects the quoted multiword aliases and period punctuation used by the English Major C specimen; its parser is for an ICK-oriented noun-last expression grammar. **There is no present ICKY integration to depend upon.**

That does not disqualify it forever. We can eventually reuse or extend its scanning infrastructure, but the first English Major C type experiment should not pretend it already parses English machine instructions.

## Proposed very small implementation boundary

1. Use a **small scanner** that preserves the original source, line locations, quotes, words, numbers, punctuation, and explanatory text. This can be a purpose-built scanner or, later, shared infrastructure. It need not be a replacement for ICKY.
2. Parse the English Major C source into the kinds of `english_source_item` declared by Idriç. Parsing and type classification are **distinct tasks**: Idriç `choice` gives a representation of the result, not the act of reading the source.
3. Check register names, instruction targets, permitted ARM operations, and effects on flags and the execution index. Reject a source item that cannot be justified by the machine profile. Comments and explanations are retained but contribute no executable instructions.
4. Feed **only checked executable operations** to English Major C's own ARM Thumb assembly generator. ICK is not involved.
5. Compare the generated 14-instruction assembly against the existing pinned output. Add negative cases proving that a comment with executable-looking words cannot accidentally emit machine code.

## Evidence and next acceptance boundary

- **Implemented already:** limited English-to-Thumb JavaScript prototype, draft PR #6; its eight existing tests and exact output are evidence for that prototype alone.
- **Newly authored:** Idriç `choice` *model source*. There has been no Idriç compilation, actual parsed output, direct frontend handoff, or machine execution from this source model.
- **Required before replacing the prototype:** demonstrate that an Idriç-checked parser produces the intended source-item variants from real English Major C input, preserve original text and source locations, reject invalid/ambiguous operations, and regenerate the exact intended native assembly. Keep the original prototype only as a comparison witness, not a second permanent parser.

Related: [English Major C initial architecture #1](https://github.com/dilapidated-shed/English-major-C/issues/1), [first compiler draft PR #6](https://github.com/dilapidated-shed/English-major-C/pull/6), [Flexible Pipes #93](https://github.com/isomorphisms/flexible-pipes/issues/93), [Idriç language repository](https://github.com/isomorphisms/Idric), and [ICKY parser repository](https://github.com/dilapidated-shed/icky).
