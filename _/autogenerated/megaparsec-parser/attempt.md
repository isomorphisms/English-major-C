# Attempt: parse English Major C with Megaparsec

The request on 2026-10-12 is to attempt an English Major C parser in
Megaparsec. This explicitly selects Haskell and Megaparsec for this attempt;
it does not replace the separate Idriç exploration or select a permanent
frontend for the language.

## Types before implementation

Input is Unicode source text. Output is an ordered `Program` of `Located
SourceItem` values. Each location preserves the exact original text, starting
and ending character offsets, and source-file/line/column positions. Offsets
are character offsets, not machine byte addresses or execution indices.

`SourceItem` distinguishes a machine declaration, a register-name declaration,
an instruction label, an executable operation, an inert note, and an inert
explanation. `Operation` distinguishes execution-index changes from operations
on registers or memory. Within each group, each supported sentence has its own
constructor and operands; the parser must not return an undifferentiated
sentence string as the executable representation.

Register names and instruction names are distinct types containing the exact
quoted Unicode name. No abbreviation, case folding, slugification, or name
normalization defines their identity. A physical register is distinct from its
descriptive name. Notes and explanations contain text and never become
operations, even when that text resembles an instruction.

Central signatures:

- `parseProgram :: FilePath -> Text -> Either (ParseErrorBundle Text Void) Program`
- `validateProgram :: Program -> Either ValidationError ()`

Parsing is a pure action on text; reading a file and printing diagnostics
belong to the CLI. Validation is separate from syntax recognition: it checks
machine-declaration order, duplicate names, undeclared register operands,
unresolved forward branch targets, and labels without a following instruction.
It does not simulate machine execution or prove instruction encodings.

## Existing source and scope

The actual unknown-entry example and finite recognizer were inspected at
`a899263f68d016252323c91eae0eaaaaf5cd09ac`, on the existing
`fp-93-unknown-entry-direct-thumb-compiler` branch. The fixture is copied
unchanged from
`arm/thumb/addition/An unknown entry is omitted from an addition.english`.
Its source categories are compared with
`_/research/EnglishMajorC/SourceCategories.idric` at that same revision.

This attempt recognizes that existing 13-operation sentence grammar, plus the
already proposed `(NOTE: ...)` and `(WHY? BECAUSE: ...)` annotations. It is
not a grammar for all architecture documents, free English, the historical
maximum-function prose, the QR translation ledgers, or the full ARM ISA.
The specimen motivates an initial test; it is not a permanent language
definition. Further operations require explicit constructors and a reviewed
sentence grammar. Multiply and shift syntax is not invented here.

The new branch starts from main at
`8f5287f32231a2f9d09d5ebd0e36c9cd711eb27d`. This avoids importing or
silently approving the unrelated draft compiler/architecture stack.

## Effects and required facilities

The parser requires Haskell `Text`, Megaparsec 9, ordinary file IO, and pure
maps/sets for name checking. No code generation, assembly, linking, Android
runtime, ICK, or Idriç FFI is introduced. The user's explicit Megaparsec
request is the reason this is Haskell source rather than an Idriç fallback.

## Verification boundary

GHC, Cabal, and Stack were initially absent from the disposable workspace.
Ubuntu's package catalog supplied GHC 9.4.7, Cabal 3.8.1.0, and Megaparsec
9.3.1. System installation failed with a permission error; the same packages
were downloaded and extracted into a separate workspace directory. Their
package paths were relocated, the package database made directly accessible,
and existing GMP/libffi runtime libraries supplied for linking. These are
container-toolchain provisioning steps, not changes to the English grammar.

The first compiler pass found a redundant `<|>` import; it was removed. After
the provisioning errors were resolved, the library, test executable, and CLI
compiled. All 43 actual Megaparsec parser/validation assertions passed. The
CLI produced 23 typed items for the unchanged original source and rejected
unsupported-operation and undeclared-register fixtures with exit code 1.
No substitute parser supplied these results. See `verification.md`.

This is Haskell host execution evidence for the requested experiment, not
machine-code generation, ARM execution, an ICK/NDK qualification, independent
AICI acceptance, or a maintained build-system migration.

## Relationship to Idriç

This attempt leaves a concrete typed parse-output design and rejection corpus
that can be compared with an Idriç frontend. An Idriç capability gap is not
inferred from the success or failure of Megaparsec. The next useful Idriç
comparison is to recognize the same actual source and produce distinct source
categories while preserving the quoted names, comments, and error positions.
