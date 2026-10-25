# Getting started

A first narrowly constrained, independent English-to-ARM Thumb compiler has now been written as a concrete experiment; no general parser, type system, compiled runtime, or physical-device acceptance is claimed.

**First executable experiment:** [An unknown entry is omitted from an addition](../../arm/thumb/addition/README.md) supplies a direct English-to-Thumb assembler compiler, a source-line-aligned native listing, rejection tests, and a complete architectural trace. Its single-architecture/no-ICK/no-premature-types decision is in [the direct compiler decision record](../decisions/Why%20the%20first%20compiler%20emits%20assembly%20directly.english). This experiment is not R-compatible and has not yet run on ARM hardware.

**Frontend research, not yet implemented:** [Idriç source-item choices](../research/Idri%C3%A7%20source%20items%20are%20operations%20or%20comments.md) model executable operations, nonexecuting comments, explanations, register-name declarations, instruction labels, and the selected machine as different source categories. These declarations have not been checked by the Idriç compiler; the current English text compiler still uses its original small sentence recognizer. ICKY is not an active dependency of this first experiment.

**Start here:** [Given a machine: objects, processes, and execution](../../arm/thumb/Given%20a%20machine%20-%20objects%20and%20execution.english). Read the closed operation grant next, then the architecture provenance and alternatives record.

## Given these exact documents

1. [Given a machine - objects and execution.english](../../arm/thumb/Given%20a%20machine%20-%20objects%20and%20execution.english) defines the execution index, software-visible registers, memory, permissions, fetching, branching and the boundary between code and data.
2. [All and only these initial operations are permitted.english](../../arm/thumb/All%20and%20only%20these%20initial%20operations%20are%20permitted.english) names the **initial, deliberately limited** scalar T32 operation set in long English. Its ARM mappings and ISA limitations are normative constraints, not assembler shortcuts.
3. [Instruction set architecture - sources and unfulfilled coverage.english](../../arm/thumb/Instruction%20set%20architecture%20-%20sources%20and%20unfulfilled%20coverage.english) identifies ARM DDI 0406C.d, optional extensions, revision and verification obligations, and what is **not yet** completely specified.
4. [Choices for missing-value branching and execution.english](../decisions/Choices%20for%20missing-value%20branching%20and%20execution.english) retains competing strategies and the tests required to select one. This is a decision history, not an assembly-performance claim.
5. The separately authored exact definition of "execution index" is under [PR #2 — Define the execution index](https://github.com/dilapidated-shed/English-major-C/pull/2); that PR has since merged to main, without implying acceptance of the broader ISA.
