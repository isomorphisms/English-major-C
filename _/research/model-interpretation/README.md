# Several readings of English, one explicit machine interpretation

Work envelope: https://github.com/isomorphisms/flexible-pipes/issues/96

This continues the existing offline pilot and the Idriç source-category work in
English Major C's **Compile the first unknown-entry sum directly from English to
Thumb assembly** (PR #6). It does not replace that compiler or add ICK as a stage.
The model lane may understand unrestricted English. The independent Idriç lane
recognizes an explicitly programmed subset. Disagreement is retained.

## Implemented and bounded

`cases.json` contains **48 source cases**, including **10 model-smoke cases** and
**23 sentences covered by the explicit Idriç grammar**. The 13 operation families
are those in the existing unknown-entry example, not the complete Thumb ISA.
The operation profile includes exact operands, flag effects, branches, the fixed
65535 halfword writes and modulo-2^32 addition. A precise request outside it is
unsupported; incomplete English is not made precise by picking the nearest
available instruction. Richer paraphrases are deliberately included even where
the discrete parser abstains.

`experiment.mjs` preserves source/context/catalogue identity, rejects malformed
predictions, compares full interpretations and measures top-one correctness and
the rank of the expected candidate. It detects synthetic unanimous wrong
answers against explicit expected results. No consensus grants execution.

**Expected labels are assistant-authored test specifications, not an independent
proof of English meaning or ARM semantics.** They are never sent to the evaluated
models. The arithmetic comparison witness is integer arithmetic, not CPU evidence.
An independently authored audit and protected future holdouts remain necessary.

`../EnglishMajorC/DiscreteInterpreter.idric` is actual scanner/parser/driver source,
not another `choice`-only sketch. It imports the existing source-category module,
keeps character spans in tokens, recognizes the canonical thirteen operation
families and nonexecuting source roles, checks declared operand names and returns
structured results. It does not invoke models, JavaScript parsing, or assembly.
Its grammar intentionally rejects unfamiliar paraphrases. The source is UNCOMPILED
until an exact-head result from the pinned compiler demonstrates otherwise.

`run-local.mjs` is an inference adapter for an **already-available local
llama-server executable**. It hashes actual weights and the runtime executable,
starts a CPU-only server on loopback, captures its actual chat template, raw
requests/responses, settings and source/context identity. It rejects truncated or
malformed output rather than repairing it. It never invokes a paid provider.
Real inference has NOT been executed in the authoring container.

## Executed local checks

From the repository root:

```text
node --test _/research/model-interpretation/*.test.mjs
```

The inherited eight controls and twenty-eight new tests pass locally. This is
**36 offline evaluator/downloader/adapter tests**, not 36 model successes.
Some checks traverse the entire 48-case corpus; the corpus count is separate.
The test weight file is deliberately fake and is never presented as a model.

## Actual Idriç qualification

`english-discrete.ipkg` builds the maintained `.idric` source using canonical
Idriç **2734ac5a86610eddfab73b1644d72b4ac85a65ee**. No stock Idris fallback exists.
The public-runner workflow checks out that source and calls its `edric bootstrap`
and existing `edric001` smoke before compiling this package. It then executes
all 48 inputs: the 23 declared grammar cases must match; the other cases must
not be silently interpreted. This is host-language recognition, not ARM execution.
The receipt hashes the full compiler/interpreter payload directories as well as
the wrappers, and records the source head. Compiler or parser failures remain
failures, not a skipped pass. Idriç is absent from the authoring container.

## Free model files; outside Git

`model-files.json` pins three publisher files by repository revision, exact byte
size and SHA-256. Total **5,692,295,840 bytes**. Each is below 2 GiB; all publisher
cards declare Apache-2.0. The model names contain “Smol”/“micro” because those are
publisher names, not a change to the agreed reason for selecting them: the
GitHub-file-size and zero-additional-spend constraints.

| Family | Pinned file | Bytes |
|---|---|---:|
| SmolLM | SmolLM3-Q4_K_M.gguf | 1,915,305,312 |
| Granite | granite-4.0-h-micro-Q4_K_M.gguf | 1,942,564,512 |
| Qwen | Qwen3-1.7B-Q8_0.gguf | 1,834,426,016 |

Publisher evidence, including the LFS SHA-256 and size:
- https://huggingface.co/ggml-org/SmolLM3-3B-GGUF/blob/main/SmolLM3-Q4_K_M.gguf
- https://huggingface.co/ibm-granite/granite-4.0-h-micro-GGUF/blob/main/granite-4.0-h-micro-Q4_K_M.gguf
- https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/blob/main/Qwen3-1.7B-Q8_0.gguf

The downloader checks persistent free space with a one-GiB reserve, downloads
only pinned public HTTPS files, checks actual bytes and SHA-256, and refuses to
replace a mismatched or concurrently created destination. There is no API key,
LFS operation, paid fallback, or weight upload. Example on a qualified host:

```text
node _/research/model-interpretation/model-io.mjs plan
node _/research/model-interpretation/model-io.mjs download qwen3 /absolute/model/cache
node _/research/model-interpretation/run-local.mjs qwen3 /absolute/model/cache /absolute/path/to/llama-server /absolute/receipt/directory --smoke
```

Repeat with `smollm3` and `granite4`. Omit `--smoke` for all 48 cases. The supplied
runtime must actually support the model and the llama-server chat API; this
adapter does not install, qualify or silently replace it. Keep raw receipts even
when predictions are wrong. A completed experiment is not a passed accuracy gate.
Hashes identify artifacts but cannot prove a malicious producer's assertions.

## Cost and delivery boundaries

The workflow only uses standard GitHub-hosted Ubuntu runners **in a public
repository**. It has no GPU rental, inference API, cache action, artifact upload,
or model publication. Logs retain the evidence without model-weight storage.
GitHub's public standard-runner/free-log rules are documented at:
https://docs.github.com/en/billing/concepts/product-billing/github-actions

The local download attempt failed because the host cannot resolve external DNS.
No weights or tokenizer assets were fetched; no model inference ran. No paid
service was started. The workflow must not be described as passing before its
actual result is inspected. Flexible Pipes origin enforcement, independent AICI
acceptance, compiler lowering and ARM execution remain distinct unresolved gates.
No source author or consensus result authorizes merge or publication.

## Free public-host execution path

The PR workflow also runs each pinned model on a standard `ubuntu-24.04`
public GitHub-hosted CPU runner. It downloads the checked official llama.cpp
`b11560` Ubuntu x64 runtime (source `b13a93a3d5fa44b57899d86467a4de463e7415a7`,
archive SHA256 `55d446939872f9370bbdad57517fece1aebaca99251f4e12c801e4dc9d807512`),
and one checked model file. This consumes a foreign prebuilt runtime, not an
undeclared first-party C/C++ build. No GPU rental, paid API, private/larger
runner, LFS, artifact-upload or cache action is used. Raw requests and answers
are JSON-escaped in plain job logs for replay. Job success means the experiment
ran, not that the model interpreted the English correctly. Inspect actual
results and failures; an unrun workflow is not inference evidence.

Official runtime: https://github.com/ggml-org/llama.cpp/releases/tag/b11560
GitHub public standard-runner billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions

The original fixed 65535 low/high-halfword productions denote their existing
flag-preserving operations by definition of this profile, like the specified
compare/load/control-transfer forms. That is an explicit profile convention,
not a general default that all English assignments preserve flags. Generic
"clear" without a flag qualification remains ambiguous.
