# DEX instructions in precise English

This catalogue accounts for all **256 primary opcode bytes**: **224 standard
instructions and 32 unused values** in the modern standard profile. Each
standard instruction has its own complete English operation and metadata.
This is architectural documentation, with no English compiler or interpreter.
Read the [audit and acceptance limits](../evidence/DEX-catalogue-audit.md)
before treating coverage counts as semantic acceptance. Automated checks cover
inventory and file consistency; the English descriptions require reading and
source review. Running ai-ci is not a prose-approval or merge prerequisite.

Read in this order:

1. [The DEX machine](../../dex/Given%20a%20DEX%20machine.english): frames, values,
   references, calls, the execution index and exceptional completion.
2. [Formats and payloads](../../dex/Instruction%20formats%20and%20data%20payloads.english):
   all 26 used instruction formats and all three data-payload layouts.
3. [Shared validity and effects](../../dex/Validity%20arithmetic%20and%20shared%20effects.english):
   the named rules cited in individual entries, including arithmetic and memory.
4. [Every primary opcode](../../dex/Every%20primary%20opcode.english): 256 numbered entries.
5. [Plaintext inventory](../../dex/inventory.tsv) and [format mapping](../../dex/formats.tsv).
6. [Optimized instruction namespaces](../../dex/Optimized%20instructions%20are%20a%20different%20namespace.english).
7. [Inspection examples](../../dex/Reading%20DEX%20code%20units.english).

The supported version labels are **035, 037, 038, 039, 040 and 041**. Earlier
archival formats 009/013 and future unknown versions are not covered. Version
037 changes interface invocation context without adding opcode bytes. Version
038 adds `invoke-polymorphic`, `invoke-polymorphic/range`, `invoke-custom` and
`invoke-custom/range`. Version 039 adds `const-method-handle` and
`const-method-type`; Android 10 also uses 039 for boot-class-path hidden-API
metadata. Version 040 changes allowed names, not this opcode map. Version 041
adds an experimental container format; the current AOSP page says not to use
it for production. A profile here does not assert that any particular Android
release or device accepts every version.

The TSV has one header and exactly 256 data rows ordered by byte. `number`
is one through 256, `opcode` is the byte identity, and `validity` is either
`standard` or `reserved`. A minimum version of `-` gives no portable meaning.
The reserved rows use the source tables' nominal `10x` classification but
give no executable length or successful continuation. The `english` column
is identical to the corresponding operation paragraph in the `.english` file.
The bit layouts refer to the field definitions in the formats document;
they are not a grammatical template for the operation's English sentences.

The primary-byte inventory does not count payload identifiers as three extra
primary opcodes. Their low byte is 0x00, but their complete identifiers are
0x0100, 0x0200 and 0x0300, and they must not be executed as `nop`.

## Source keys

| Key | Authoritative section or independent check |
| --- | --- |
| B | [AOSP Dalvik bytecode](https://source.android.com/docs/core/runtime/dalvik-bytecode), opcode table and mathematical details |
| F | [AOSP instruction formats](https://source.android.com/docs/core/runtime/instruction-formats), Formats |
| D | [AOSP DEX file format](https://source.android.com/docs/core/runtime/dex-format), magic/version history, code_item and reference tables |
| C | [AOSP constraints](https://source.android.com/docs/core/runtime/constraints), static and structural validity |
| ART-LIST | [Frozen AOSP-derived instruction list](../fixtures/dex/sources/art-dex-instruction-list.h), read through a named LineageOS fork |
| SMALI | [Frozen independent dexlib2 enum](../fixtures/dex/sources/smali-Opcode.java), including explicit optimized-only entries |

[The source manifest](../fixtures/dex/sources/manifest.tsv) records exact
blob identities, immutable references where available, local SHA-256 digests
and the distinction between full snapshots and numbered source excerpts.
Source tables can contain errors; the audit records the discrepancies found.

## Connections and evidence

- [What is the execution index?](../../What%20is%20the%20execution%20index%3F)
  supplies the general concept. DEX specializes it to a method plus a code-unit
  offset; the existing definition is unchanged.
- [The ARM T32 machine](../../arm/thumb/Given%20a%20machine%20-%20objects%20and%20execution.english)
  and [its bit operations](../../arm/thumb/Exactly%20how%20register%20bits%20are%20rearranged.english)
  show the repository's prior precise operation style. A DEX register is not
  an ARM register and an ART lowering needs a separate raw-machine account.
- [The canonical Idriç direct-DEX backend](https://github.com/isomorphisms/android-NDK/blob/main/dex/idric/src/Backend/DEX/README.md)
  provides the checked-source-to-DEX path and adjacent ANF, plan, smali and DEX
  evidence files. This catalogue is independent of that backend's subset and
  does not extend it.
- [Source-check fixtures](../fixtures/dex/source-facts.tsv) preserve concrete
  implementation corroboration. They do not claim an executed runtime test.
- [The bounded validator](../autogenerated/dex-inventory/verify.mjs)
  compares both independent opcode tables, prose/TSV agreement, version sets,
  source hashes and targeted intentionally bad inventory mutations.
- [The Idriç attempt record](../autogenerated/dex-inventory/attempt.md)
  preserves the actual unbootstrapped-compiler failure and the separate fallback.

From any working directory, Node can run the checker by its absolute path;
the checker finds its repository root from its own file location. It accepts
an explicit absolute root for checking another prepared tree. This source
audit is not ai-ci acceptance, ART execution or proof of English semantics.
