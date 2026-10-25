# Preserve listing records and full instruction meanings

This extends the maintained Idriç files in `_/research/EnglishMajorC/`; no second
parser or executable is introduced here.

Domain: A32 listing rows, instruction forms, physical registers, original
machine words, byte addresses, one-based source line numbers and raw text.
The existing sixteen singleton register identities and role subsets remain.
Each of six admitted forms has a distinct singleton type, now named for its
full operation. Source spelling and machine words remain provenance.

Central operations:

- `parse_listing_line : Number → Text → Either Text parsed_listing_record`
- `parse_listing_from_line : Number → List Text → Either Text (List parsed_listing_record)`
- `expected_machine_word : a32_instruction → Number`
- `record_source : parsed_listing_record → (Number, Text)`

Classification distinguishes object/section/symbol headers, relocation
annotations, literal words, blank lines and checked instructions. Unsupported
or malformed records fail; known nonexecuting rows retain raw source evidence.
Instruction construction still checks operand roles and reconstructed words.
This does not establish type-level immediate bounds, complete relocation
resolution, complete ISA decoding or executable instruction effects.

`--with-source` prints every accepted record's original text and source position.
Default normalized instruction output uses full semantic English names.
The original complete-listing rejection expectation is preserved.

Effects: read a listing file, print source/typed instruction records, fail on a
malformed or unsupported row. Host target: Linux x86_64, canonical Idriç Chez
code generation; ARM execution is not performed by the parser.

First local prerequisite failure: canonical compiler revision
2734ac5a86610eddfab73b1644d72b4ac85a65ee, invoked via `edric bootstrap`,
builds inherited RefC support and fails because `gmp.h` is absent. No alternate
parser/compiler has been used. This failure is separate from source acceptance.
Hosted exact-head compilation and real-binary tests remain required.

Language work: no syntax extension has yet been demonstrated necessary. A
compiler diagnostic must be reduced in the canonical compiler if it appears;
the parser is not to be rewritten in a different implementation language.
