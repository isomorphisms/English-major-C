# DEX catalogue audit — 2026-10-24

Task: SUN ENGLISH-MAJOR-DEX-01. Local branch: `sun/english-major-dex-01`.
Starting default-branch commit: `35c3c37a4db9288173dd41447854f0e025ea358f`.
Overall status: **SOURCE-REVIEWED DOCUMENTATION; AUTOMATED SCOPE IS STRUCTURAL**.
The initial local snapshot at `2bd094d944c022162ab8f6650a51855c24ab27ae`
was unpublished. The user subsequently requested publication and merge and
clarified: "It's text, aici can't really test this."
Automated inventory, source-identity and synchronization checks remain useful;
they cannot approve the English descriptions' meaning or precision. An ai-ci
compiler/runtime pipeline is not a publication or merge prerequisite for this
catalogue. Source disagreements remain visible content qualifications rather
than a claim that a green program proved the prose.

## What exists

- A DEX virtual-machine contract, shared validity/effect rules, 26 instruction
  format definitions and all three payload layouts in `.english` files.
- Exactly 256 individually numbered primary-byte entries: 224 standard and
  32 reserved. Each standard entry has an authored English operation, encoding,
  reads, changes, continuation, contextual restrictions, exceptions and sources.
- A synchronized 256-row plaintext TSV, separate format TSV, and separate
  optimized-namespace note. Historical optimized meanings are not granted as
  portable instructions or counted as extra standard primary bytes.
- Explicit version sets 035/037/038/039/040/041, including the 038 and 039
  additions. The early archival formats and unknown future versions are outside
  the profile. Version 041's experimental status is retained.
- Source-check fixtures, hashed foreign snapshots/excerpts, a bounded inventory
  checker, an inspection example, README links and a prepared ai-ci contract.

## Local verification recorded before publication

Host Node: `v24.22.1`. The source checker runs from its own location, independent
of the caller's working directory.

| Check | Actual result | What the result establishes |
| --- | --- | --- |
| 256 unique ordered primary bytes | PASS | Exactly once, no missing/extra byte in this profile |
| AOSP-derived ART instruction list | PASS, 256 rows | Mnemonics, formats, lengths and reserved classification agree |
| Independent dexlib2 source enum | PASS, 224 portable entries | A second maintained table agrees after the explicit 21h alias mapping |
| Version sets, 26 formats, payload identifiers | PASS | Structural/source-map agreement, not an ART load test |
| English/TSV paragraphs and metadata | PASS | Byte-content synchronization, not automatic judgment of prose precision |
| Thirteen preserved implementation observations | PASS | Recorded source facts remain present in the frozen excerpts |
| Source SHA-256 identities | PASS | Local snapshots/excerpts match their manifest |
| Ten targeted bad mutations | PASS, all rejected | Completeness, duplicates, range, mnemonic, format, version, synchronization, payload and source-identity failures are detected |
| Existing ARM/x86 compiler/rejection tests | PASS, 19 tests | Existing selected test behavior remains intact |
| Existing ARM documents, execution-index definition, tools, tests and experiments | Unchanged | Read-only comparison against the starting commit shows no edits to these paths |
| Optional ai-ci structural suite | NOT_RUN | No qualified executable/compiler was available; not a pass and not a prose gate |
| New GitHub workflow at the initial local snapshot | NOT_RUN | Later hosted runs are recorded on the publication pull request |
| Idriç finite-list validation slice | BLOCKED | Actual compiler invocation exited 2 because that compiler was not bootstrapped |
| ART, independent decoder executable, or physical-device execution | NOT_RUN | Not required to implement a runtime for this documentation task; no such evidence claimed |

The exact source-checker output and the selected regression test output are
retained in adjacent `dex-catalogue-validation.txt` and
`dex-existing-regressions.txt`. A candidate file digest manifest records the
checked documentation, source packet and checker without a circular hash of
the manifest itself. These are source/audit receipts, not formal proofs.

The first validator draft used an arbitrary paragraph-length threshold. An
otherwise nonempty operation failed it; the threshold was removed because
length is not semantic precision. A separate comparison initially failed on
dexlib2's `21ih`/`21lh` names. The checker now explicitly maps only those two
names to AOSP `21h`, preserving the distinct int/wide high-half meanings in
the actual entries and formats document. The good input then passed and the
targeted bad controls all failed with their intended diagnostics.

## Source disagreements and limits

1. **Primitive cast/test targets.** The public bytecode table discusses runtime
   outcomes for primitive targets of `check-cast` and `instance-of`. The inspected
   ART verifier rejects primitive and void targets through
   `FailForVoidOrPrimitiveType`. The relevant entries preserve the public-table
   description and separately identify the rejection. They do not claim that
   this context is verified executable ART input. Null reference casts to an
   admissible reference type remain distinct from the primitive-target issue.
2. **Filled arrays.** The public table excludes long/double components because
   each component takes one register word. The inspected ART interpreter also
   throws `InternalError` for primitive components other than int. That is an
   implementation support restriction, not evidence that the standard table
   silently means only int. Both instruction entries and ARRAY-CREATION name
   the discrepancy. A portable source description is not a claim that every
   corresponding implementation path runs on this ART revision.
3. **Constraints-table mistakes.** Several operand-letter labels in the public
   constraints table disagree with the format/opcode tables (for example A11
   names C for the static-field reference, while 21c uses B). A18 similarly
   labels filled-new-array's reference as C where 35c uses B. A21's wording
   about a non-reference new-array type conflicts with the bytecode table's
   required array type. The catalogue uses the opcode and bit-format tables,
   corroborated by the independent decoder and verifier, and records these
   conflicts rather than transferring them into invented encodings.
4. **Optimized collisions.** The independent decoder deliberately maps the same
   numerical bytes differently across Dalvik and ART versions and portable
   DEX. Its ODEX_ONLY entries are excluded from the portable comparison. No
   universal optimized-ISA completeness claim is made.
5. **Boolean value domains.** Ordinary Boolean semantics describe zero and one.
   The inspected verifier's primitive-store compatibility is weaker than a
   general source-language assignment rule and accepts integral categories.
   This source audit does not establish a portable contract for arbitrary
   noncanonical integer patterns placed into Boolean storage. The catalogue's
   Boolean descriptions concern Boolean values; exact noncanonical acceptance
   and storage behavior require an additional authoritative/runtime specimen.
6. **Source provenance.** The implementation code was read through the named
   `LineageOS/android_art` fork, pinned by commit and file blob, because official
   AOSP Gitiles retrieval failed. No claim is made that this entire fork equals
   an official AOSP tag. Public AOSP documentation was read directly. The
   independent decoder source was read; its binary was not built or executed.
7. **Prose quality and exceptional ordering.** Two opcode-table comparisons and
   mutation tests do not independently prove every English sentence or all
   resolution/error-priority interactions. The catalogue explicitly avoids
   inventing a priority where the sources do not determine one. Arbitrary
   exceptions/effects of a callee or initializer are scoped separately from
   an opcode's immediate failures. A complete semantic acceptance verdict is
   not issued by this structural checker.

## Automated checks do not approve the prose

ai-ci acceptance: NOT_RUN

The inspected shared ai-ci revision is
`32cb45b3a3a257aeb07881c75f3b846495cfb2c9`. Its generic kernel source and
contract syntax were read. The local host exposes neither `aici` nor `ick`
on the available program path, and no target-specific Cat Food entrypoint or
qualified NDK was established. Building it with an arbitrary host compiler
would not satisfy the user's ICK-or-NDK policy. No replacement verifier is
represented as ai-ci.

The optional prepared suite is `ci/dex-catalogue.suite.tsv`. It checks
TSV/schema/audit boundaries only. Neither it nor the inventory checker is an
independent semantic proof of DEX English. The current root ai-ci action's
legacy `cc` build is not adopted here, and compiler acquisition is unnecessary
for publishing this text.

The user's clarification retires the earlier claim that an unrun ai-ci suite
blocks this documentation. The descriptions are assessed by reading and
checking their sources. Future corrections should amend the affected entries
and preserve the distinction between specification and implementation.
NOT_RUN remains an accurate historical test result; it is not relabeled PASS.
No DEX compiler, parser, interpreter, ART replacement, Idriç compiler extension
or general English grammar was created under this job.
