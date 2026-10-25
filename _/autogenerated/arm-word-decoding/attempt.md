# Decode saved instruction fields before checking assembler text

Values: an unsigned thirty-two-bit saved word, physical-register identities,
typed operand roles and one of the six existing closed A32 instruction forms.

Signatures: `decode_saved_machine_word : Number → Maybe a32_instruction`;
`encoded_field : Number → Number → Number → Number` extracts a bit field;
`physical_register_from_encoding : Number → Maybe a32_register` resolves the
four-bit register field to the same singleton register families as the lexer.

Invariant: no printed mnemonic or operand participates in decoding. Fixed
encoding fields, condition/flag variants, SP/PC roles and immediate restrictions
must match the admitted forms. The listing path then also reconstructs the word
from independently parsed text. This is a decoder/encoder cross-check for six
forms, not an independent ARM architecture oracle or complete ISA coverage.

Effects: pure decoding; the existing parser CLI exposes a word-only diagnostic.
No memory access, ARM execution or native target build occurs.

Target: canonical Idriç host Chez compiler. Acceptance must execute all saved
prefix words through both paths and reject changed flags, conditions, writeback,
register roles, forbidden shift fields and out-of-range raw values. Source
presence alone is not acceptance. No alternate parser implementation is used.

First compiler result: the original field expression requested an `Integral`
instance for `Number`, which the current implicit imports do not provide.
Inherited number division also uses repeated subtraction and is inappropriate
for these saved thirty-two-bit values. The corrected raw boundary uses exact
`Integer` quotient/remainder with positive powers of two, then returns the
nonnegative field as `Number`. This remains Idriç and does not change or replace
the parser, runtime, or compiler. No additional language syntax is required.

The first exact-integer expression also exposed the current annotation/infix
grammar boundary: `(cast word : Integer)` before an infix division was treated
as a type-binding operator argument. The preserved diagnostic is not arithmetic
execution. A separately typed exact-conversion function makes the same intent
unambiguous using the current language surface.
