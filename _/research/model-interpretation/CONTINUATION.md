# Format-controlled continuation of FP-96

This continues draft PR #13, **Compare rich English model rankings with an
independent Idric parser**. It does not replace the original experiment.

## Preserved baseline

Source head `9e6cb498762787f5f4e899391dabb23ce9b70e48`, workflow
[38207784052](https://github.com/dilapidated-shed/English-major-C/actions/runs/38207784052).
The original three model jobs and all original responses remain unmodified.
Their strict complete top-one results were 0/10; formatting errors made those
figures unsuitable as a standalone measure of English understanding.

The **48 source sentences, expected meanings, context and ten-case subset are
unchanged**. The corpus file byte SHA-256 remains
`69f2525e093e41784f0cf1d1b1888aaa48316c5afa72e45881b0c43c2618135d`.
The baseline prompt is still the default `baseline/1`; its messages were
compared byte-for-byte against the previous implementation for all 48 inputs.

## Two matched format controls

Both conditions use prompt `named-object/2`, which displays operands as a
named object, explains the serialization, and explicitly permits a single
candidate instead of padding rankings with duplicates. It gives no solved
corpus example. Sentence wording, catalogue meanings, model files, runtime,
temperature 0, seed 7, 768-token output bound and disabled thinking stay fixed.

- `named-json`: generic JSON generation with the corrected description.
- `named-schema`: the same prompt, with schema-constrained generation over
  the complete existing operation catalogue and all declared names/statuses.

Only the generation constraint differs between these two new conditions.
Comparison against the historical baseline also changes prompt representation;
it is not a schema-only experiment. Each arm starts a fresh local model server.
No model sees another model's output or the expected answers.

The schema constrains output, not the English input. It can enforce legal
operand shapes and the effects associated with an opcode. **That is not proof
that the opcode matches the English.** The consumer still checks all outputs.
The pinned runtime supports a subset of JSON Schema; no unsupported
`uniqueItems`, `prefixItems`, conditionals or remote references are required.
Consecutive ranks and duplicate detection remain ordinary consumer checks.

Runtime source documentation:
[JSON schemas to GBNF](https://github.com/ggml-org/llama.cpp/blob/b13a93a3d5fa44b57899d86467a4de463e7415a7/grammars/README.md#json-schemas--gbnf).

## Metrics do not hide failures

The original complete-response validator and strict score are retained.
Additional diagnostics separately record completion, JSON validity, full
contract validity, status, each candidate's validity, duplicate positions,
the first candidate's exact meaning and the rank of the expected candidate.

A correct first candidate followed by a malformed/duplicate alternative stays
a **strict failure**. It is separately visible as a correct first-candidate
observation. Arrays are never repaired into named operands, unknown fields
are never stripped, ranks are never reordered, and truncated answers are
never completed. Neither metric authorizes compilation or execution.

Actual responses and requests are retained in the original plain job logs.
The result includes each condition and the request, prompt, context and raw
response digests. `observed_top_key` supports later cross-model disagreement
analysis without treating an invalid candidate as a valid interpretation.

## Idriç repair

The baseline Idriç job
[114675010935](https://github.com/dilapidated-shed/English-major-C/actions/runs/38207784052/job/114675010935)
successfully bootstrapped canonical Idriç
`2734ac5a86610eddfab73b1644d72b4ac85a65ee`, passed `edric001`, and compiled
`SourceCategories.idric`. `DiscreteInterpreter.idric` then failed parsing:
`Expected a capitalised identifier, got: located_token`.

Replace that inherited-record syntax with a single-case Idriç `choice`
and explicit accessors, retaining the same start/end/token fields and
lowercase Idriç names. This does not modify the compiler or substitute
ordinary Idris. The repaired source requires a fresh actual compiler result.

## Verification at submission

**54/54 local Node tests passed**: all 36 existing tests plus 18 new
format/diagnostic controls. A separate matched check confirmed all 48 baseline
prompts unchanged. No new model result or repaired Idriç compilation is claimed
before the exact-head hosted run completes. No expected labels were changed.

Standard public `ubuntu-24.04` CPU runners remain the only execution hosts.
No LFS, paid model endpoint, rented GPU, larger runner, cache action or artifact
upload was added. These are experiment results, not independent AICI, ARM
execution, release or merge acceptance.
