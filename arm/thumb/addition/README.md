# An unknown entry is omitted from an addition

This is the first deliberately narrow executable example of English Major C. **The compiler is ours and emits ARMv7-A Thumb assembly directly.** It does not use ICK, R, an existing C compiler as its language frontend, or a general type system.

Start with [the English instructions](An%20unknown%20entry%20is%20omitted%20from%20an%20addition.english), then compare [the compiler's actual assembly output](generated-thumb.s) with [the completely accounted-for example path](An%20accounted-for%20execution%20path.md). The latter is a hand-derived architectural trace, not a claim of physical execution.

## What is allowed in this first program

Four successive four-byte memory words contain `4`, `7`, `unknown`, `3`. The intended answer is `14`. The special thirty-two-bit word `0xFFFFFFFF` temporarily means **unknown**. An ordinary zero word remains a known zero. This chosen representation cannot express the all-ones bit pattern as an ordinary, known entry. That is an explicit limitation of this experiment, **not a permanent design decision or a type-system rule**.

The machine adds the remaining words modulo `2^32`, as required by the particular instructions used here. Empty input and all-unknown input yield zero. There is no R `na.rm` switch, no distinction between NA and NaN, no signed-versus-unsigned language type, no automatic conversion, and no attempt to implement all of R's `sum` behavior.

## Exact entry and return assumptions

The target is the previously proposed, symbolic **ARMv7-A T32 (Thumb) unprivileged machine**, defined by [the machine declaration](../Given%20a%20machine%20-%20objects%20and%20execution.english) and [its closed initial operation grant](../All%20and%20only%20these%20initial%20operations%20are%20permitted.english). One instruction may occupy two or four bytes; the execution index counts **byte addresses**, not instructions.

At entry, register zero contains the address of the first memory word, register one contains its nonnegative entry count, and the link register contains a valid tagged Thumb return address. The specified count of consecutive four-byte words is readable, correctly aligned, little-endian, and unchanged while the routine runs. The register-zero address can be advanced by four for every entry without wrapping the address space; all loads and branch targets are permitted by the mapped process. No input access fault is treated as an unknown entry.

During execution, register two holds the running total, register three holds the current word, and register twelve holds the chosen unknown marker. The comparison instructions set condition flags; the immediately following conditional branches consult those flags. The other additions, subtraction and copies are deliberately chosen not to change the flags. Register zero ends holding the result; register one is zero. The routine may change registers two, three, twelve and the flags, but does not write input memory or touch the stack. Its final instruction uses the return address stored in the link register.

The first compiler accepts only the exact small collection of English instruction sentence forms used here. It checks named registers, duplicate instruction names, and unresolved branch destinations, and rejects any sentence outside its allowed grammar. Every executable English sentence emits **one** machine instruction; naming an instruction creates a label, not an extra instruction. A genuine ARM assembler must still establish encoding legality and branch reach.

## Design choices retained rather than hidden

**Unknown marker versus a separate validity word:** A reserved marker needs one memory word per element but makes one ordinary bit pattern unavailable. Keeping a second validity field would represent that bit pattern too, while introducing more memory operations. We have not chosen a general language representation.

**Branch over the addition versus conditional execution or branchless selection:** This first program explicitly branches over the addition when an unknown word is encountered. Thumb's bounded `IT` mechanism or a mask could provide different choices, but no performance measurement has justified changing the current program. Hardware instruction prefetch and branch prediction are not software branches.

**R compatibility:** The longer [branching alternatives record](../../../_/decisions/Choices%20for%20missing-value%20branching%20and%20execution.english) retains the earlier R-related questions as possible future comparisons. Its R-specific constraints do not govern this deliberately smaller first program. [The direct-compiler decision](../../decisions/Why the first compiler emits assembly directly.english) supersedes earlier suggestions of using ICK as an English Major C compiler stage.

## Reproduce the compiler's source-only tests

From the repository root, using an available Node runtime:

```sh
node _/tools/compile-english-assembly.mjs \
  'arm/thumb/addition/An unknown entry is omitted from an addition.english' \
  'arm/thumb/addition/generated-thumb.s'
node --test _/tests/compile-english-assembly.test.mjs
```

Local tests passed all **eight** compiler checks, including invalid sentences and invalid branch targets. A separate LLVM Clang 17 diagnostic assembler accepted this generated code and displayed a 14-instruction, 44-byte Thumb routine. Its exact instruction bytes and the evidence limits are in [the diagnostic record](../../../_/evidence/unknown-entry-sum-diagnostic-2026-10-11.md).

**Not yet established:** execution on a physical ARM CPU, target operating-system permissions, maintained Android NDK assembler/linker acceptance, exact-head independent AICI acceptance, or performance. Any future maintained assembly/link stage should declare the Android NDK toolchain; ICK is not part of the English-to-assembly compiler.
