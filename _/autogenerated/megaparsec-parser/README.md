# English Major C: Megaparsec attempt

This is a Haskell/Megaparsec parser attempt for the existing finite executable
English sentence grammar. The library and CLI compiled with **GHC 9.4.7**,
**Cabal 3.8.1.0**, and **Megaparsec 9.3.1** on Ubuntu 24.04 x86-64. All
**43 parser/validation assertions passed**. The CLI accepted the original
example as 23 typed source items and rejected both syntax and undeclared-name
fixtures with exit code 1 and source locations. The user's explicit Megaparsec request selects this
experimental implementation; it does not make Haskell the permanent frontend.

The parser produces typed values for:

- machine and register-name declarations;
- instruction names;
- operations that change the execution index;
- operations that act on registers or memory;
- inert `(NOTE: ...)` and `(WHY? BECAUSE: ...)` annotations.

Each item retains its exact source text and start/end file, line, column, and
character offsets. End positions are exclusive. These positions do not describe
the machine's instruction addresses. The term **execution index** is retained
for actual machine control flow.

`src/EnglishMajorC/Syntax.hs` defines the output types;
`Parser.hs` recognizes syntax; `Validation.hs` checks declared names and order.
`app/Main.hs` reads one source file, reports parse/name errors, and prints the
typed source items only when both stages succeed. The pure parser remains
usable independently of the command-line program.

## Exact supported source profile

The source specimen is the unchanged unknown-entry sum from
[`a899263f68d016252323c91eae0eaaaaf5cd09ac`](https://github.com/dilapidated-shed/English-major-C/tree/a899263f68d016252323c91eae0eaaaaf5cd09ac).
It supplies 14 instruction occurrences from 13 distinct operation forms, five
register declarations, three instruction labels, and one machine declaration.
The parser covers these exact forms with separate constructors, including
flag effects and operand order. It also recognizes the proposed annotations.

Sentences end in a period and may span lines. Whitespace between words can
vary, including tabs and CRLF. Literal spelling and case remain exact. Quoted
names must contain a non-space character and cannot contain quotation marks,
control characters, or line/paragraph separators. Names are preserved exactly;
no escape syntax, abbreviation, lowercasing, or assembler-label normalization is
introduced. A period inside a quoted name remains part of that name.

Annotations occur between whole source items and need balanced parentheses;
nested parentheses and all body text remain present. An annotation has no
trailing period. Text resembling an operation inside one is inert. Comments
are never skipped by the whitespace consumer. An unsupported sentence,
annotation tag, spelling, incomplete sentence, or trailing input is an error.

The current register spellings are zero, one, two, three, and twelve, matching
the inspected finite source profile. The physical-register type itself is
separate from these descriptive aliases.

Name validation permits forward branches, requires exactly one initial
machine declaration and at least one operation, prohibits duplicate physical
registers or aliases and duplicate instruction names, rejects unknown operand
names and unresolved branches, and rejects a trailing instruction label.
Multiple distinct names may designate the same following instruction. Notes
may occur before the machine declaration without becoming executable.

The pure syntax parser intentionally accepts an empty document or a
syntactically valid undeclared name; `validateProgram` rejects these as
programs. The CLI invokes both stages. The parser does not require a final
return or prove termination: those are separate execution-profile decisions.

## Test and build boundary

The Cabal package contains a library, CLI, and an `exitcode-stdio-1.0` test
suite. Its ordinary Haskell dependencies are `base`, `text`, `containers`, and
Megaparsec 9. `cabal.project.freeze` records the tested dependency versions.
It was generated from installed Ubuntu packages; container-only repository
settings and an unpinned index-state were removed. It is a dependency-version
record, not an independently reproduced compiler/package build.

On a Haskell build host, invoke Cabal with `--project-file` pointing to this
directory's **absolute** `cabal.project` path. Build target
`exe:parse-english-major-c` and test target `test:parser-tests` belong to that
project. Supply the parser CLI an absolute source-file path. This avoids an
assumption about the caller's working directory. It is source for an
experiment, not a provisioned compiler/runtime package or a maintained
ICK/NDK build.

The test suite checks the actual specimen against a manually specified typed
instruction sequence, annotation inertness, nesting, Unicode names and source
ranges, whitespace variation, CRLF, precise name identity, and targeted syntax
and name-validation failures. It must run through the actual Megaparsec
library; another recognizer does not count as this test suite passing.

No code generation, lowering, interpreter, machine-state execution, complete
ARM grammar, QR-ledger parser, general C grammar, or arbitrary English
recognition is implemented. The older maximum-function prose is intentionally
outside this finite machine-sentence profile. New multiply, shift, architecture,
and arithmetic forms require reviewed syntax and constructors.

See [verification.md](verification.md) for commands, source identities, and
observed results, and [attempt.md](attempt.md) for the type sketch, source pins, evidence boundary,
and the relationship to the separate Idriç frontend exploration.
