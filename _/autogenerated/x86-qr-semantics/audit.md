# EMC-3 — independent audit of the recorded x86-64 meanings

**Audit completed; full semantic acceptance fails.** The first concrete defect
is the missing high-half clear on a false 32-bit conditional move. This report
preserves the original translations so the defect remains independently
inspectable. It does not repair them or promote this stack for merging.

## Exact subject and independence

Audited [dilapidated-shed/English-major-C PR #7, “Translate all recorded R QR x86-64 instructions into inspectable English”](https://github.com/dilapidated-shed/English-major-C/pull/7)
at `df120963a76ad9e2587ef8ea87ad26bd958d80c5`, based on the original archive at
`9c2f8f876612768b489ccd06a2cddaf24ed912c7`.

The existing crosswalk is an input check, not the semantic oracle. Independence
comes from newly decoding the saved ELF bytes with GNU objdump 2.42, reading
Intel's instruction operations, and executing specified byte specimens on
native x86-64 Linux. The observed host identifies as AMD EPYC 9V74 under KVM;
this is native host CPU execution, not an ARM run or physical-device evidence.
A second language model or the annotation generator's own prose was not used
as an oracle.

The source reference is Intel's SDM repository at
[`48741fad8f9cd646450c6f98ae945ff55acbd558`](https://github.com/intel/SDM/tree/48741fad8f9cd646450c6f98ae945ff55acbd558).
The preserved manual-text files under `data/sdm/` and accompanying formal
operations under `data/instruction/` were inspected. Intel calls its website
a preview; the official PDF manuals remain the normative ISA reference.
Sources are linked by instruction below rather than replacing them with an
informal third-party opcode summary.

## Whole-record coverage

All four saved ELF specimens were independently re-decoded. All instruction
start addresses, full encoding bytes, mnemonic and operands match the
concordances: 165 + 465 + 662 + 1,543 = **2,835 records**. The linked executable
contains copies of the three routines, so this is an overlapping listing
inventory, not 2,835 different executed instructions. All 66 object relocations
remain in the original crosswalk; runtime library implementations remain outside
these four listings.

[audit-records.tsv](audit-records.tsv) gives a disposition to every record,
in original order. These are review categories, not blanket PASS certificates:

| Disposition | Records | Meaning |
| --- | ---: | --- |
| False-branch rule wrong as a whole-register transition | 8 | Four distinct encodings plus their linked copies |
| Incomplete state rule | 117 | Known widths/flags/FP corner cases still abbreviated |
| Control or environment boundary | 153 | CALL, JMP, RET, HLT, ENDBR64 require target/stack/platform context |
| Normal effect reviewed only | 2,557 | Main normal-completion effect examined; exceptions and whole-machine completeness not qualified |

## Finding 1: a false condition does not preserve the whole register

Each affected description says to leave the destination unchanged when the
condition is false. For a 32-bit destination, the *low 32 bits* do remain
unchanged, but its enclosing 64-bit register still has bits 63..32 cleared.
Reading the sentence as a complete machine-state transition therefore gives
the wrong result. If the sentence intended only the narrow alias, it still
omits a required side effect. The accompanying machine-state summary also
states the false-destination rule without this exception.

Concrete initial state: RSI = `0xdeadbeef12345678`, R8D = `0x76543210`,
and the signed-less-or-equal condition is false. Bytes `41 0f 4e f0`
(`cmovle esi,r8d`) produce RSI = **`0x0000000012345678`**.
A 64-bit `cmovle rdx,rax` with a false condition provides the control:
it actually preserves all 64 destination bits.

The exact affected records are:

| Listing | Record | Offset | Bytes | Original operand spelling |
| --- | ---: | --- | --- | --- |
| dqrdc2 | 0079 | 0x15a | `41 0f 4e f0` | `cmovle esi,r8d` |
| dqrdc2 | 0348 | 0x6fb | `41 0f 4e c0` | `cmovle eax,r8d` |
| dqrdc2 | 0464 | 0x921 | `44 0f 4f da` | `cmovg  r11d,edx` |
| dqrsl | 0056 | 0xd2 | `0f 4f d8` | `cmovg  ebx,eax` |
| linked-executable | 0491 | 0x18fa | `41 0f 4e f0` | `cmovle esi,r8d` |
| linked-executable | 0760 | 0x1e9b | `41 0f 4e c0` | `cmovle eax,r8d` |
| linked-executable | 0876 | 0x20c1 | `44 0f 4f da` | `cmovg  r11d,edx` |
| linked-executable | 0934 | 0x21a2 | `0f 4f d8` | `cmovg  ebx,eax` |

Required full-state wording: read the source at the encoded width regardless
of the condition. Select the source low 32 bits when true, or the destination's
old low 32 bits when false. Write those selected bits to the low half of the
enclosing register and clear its upper half in both cases. Preserve condition
flags; a memory source, if present, may still fault on a false condition. The
archive's affected encodings use register sources, so the latter fault case
has not been dynamically exercised here.

[Intel CMOVcc operation](https://github.com/intel/SDM/blob/48741fad8f9cd646450c6f98ae945ff55acbd558/data/sdm/CMOVcc.docbook)
explicitly covers the 32-bit false-condition clear. Native cases 1..8 confirm
four encodings with both true and false conditions; case 9 checks the 64-bit
contrast. Selecting the old whole-register expectation with
`OLD_FALSE_BRANCH_CLAIM=1` causes an exit of **1 at case 1**. No output is
emitted by the failing witness. Thus a mechanically perfect byte crosswalk can
coexist with a wrong state rule.

## Finding 2: named shift and multiplication rules are still partial

The shift records defer flag effects to the count without supplying them.
Their actual immediates make a more precise rule possible now: use a 6-bit
count mask for 64-bit operands and 5 bits otherwise. A nonzero effective count
sets carry to the last bit shifted out and sets sign/zero/parity from the
result; auxiliary carry is undefined. Overflow is defined for count one and
undefined for the larger recorded counts. With effective count zero, flags
are unchanged. SAR copies the sign bit; SHR inserts zero. A 32-bit register
result clears the upper register half. Do not invent a value for undefined
flags.

The IMUL records leave the two-versus-three-operand convention unresolved even
though their bytes and operand count settle it. For the recorded two-operand
form, multiply the old destination by the source; for the three-operand form,
multiply the two source values. Retain the low encoded-width result, clear the
upper register half on a 32-bit write, and set both carry and overflow precisely
when the full signed product does not fit in that width. Other arithmetic flags
are undefined. An encoded narrow immediate must have its specified sign
extension. No one-operand high-product form occurs in these specimens.

Native cases 17..21 confirm selected exact archive bytes and compare only
defined flag bits. They do not turn the remaining partial prose into executable
rules. See [Intel shifts](https://github.com/intel/SDM/blob/48741fad8f9cd646450c6f98ae945ff55acbd558/data/sdm/SAL-SAR-SHL-SHR.docbook)
and [IMUL](https://github.com/intel/SDM/blob/48741fad8f9cd646450c6f98ae945ff55acbd558/data/sdm/IMUL.docbook).

## Finding 3: floating compare and maximum need complete conditions

For a completed COMISD or UCOMISD, ordered greater/less/equal produces
ZF/PF/CF = 000/001/100; unordered produces 111. OF, SF and AF clear on **all**
completed outcomes, including unordered. If an unmasked SIMD floating exception
occurs, the comparison does not update these flags. Both instructions can
report a denormal operand; UCOMISD reports invalid for a signaling NaN, while
COMISD reports invalid for either quiet or signaling NaN. Masking, MXCSR status,
denormals-are-zero and the running floating environment must be explicit.
The original records mention NaNs but leave ordered flag mappings and exception
completion as references rather than fully stated operations.

Native cases 13..14 use masked exceptions and an exact quiet NaN. UCOMISD
sets unordered flags without setting the invalid sticky bit; COMISD sets that
bit. Both clear OF/SF/AF. Unmasked exceptions and signaling-NaN/denormal cases
remain unexecuted here. See [UCOMISD](https://github.com/intel/SDM/blob/48741fad8f9cd646450c6f98ae945ff55acbd558/data/sdm/UCOMISD.docbook)
and [COMISD](https://github.com/intel/SDM/blob/48741fad8f9cd646450c6f98ae945ff55acbd558/data/sdm/COMISD.docbook).

The recorded legacy MAXSD selects the second operand when both are signed
zeros or either is a NaN; otherwise it chooses the greater low-lane value.
It preserves the destination's high lane. A vague noncommutative-max warning
is correct but not a complete selection rule. Cases 15..16 check source signed
zero and source quiet NaN. Signaling NaN and all exception behavior still need
qualification. See [MAXSD](https://github.com/intel/SDM/blob/48741fad8f9cd646450c6f98ae945ff55acbd558/data/sdm/MAXSD.docbook).

## Useful controls that passed, with limited claims

The memory MOVSD forms preserve the source payload and clear the high XMM lane
when loading into an XMM register. MOVQ into XMM also clears that high lane.
One separately labelled MOVSD register-register contrast case preserves it;
that encoding is **absent from the archive** and is not counted as an archived
specimen. Twenty-one cases use archive bytes; one is this contrast control.

The memory-looking eight-byte NOP executes with a noncanonical address value
without dereferencing it. Exact instruction length remains the sequential
execution-index increment. Ordinary LEA/MOV/MOVSXD, logic operations, signed
versus unsigned branch predicates, 16-bit AX exchange and scalar-conversion
widths were reviewed at normal completion. Register aliasing, memory faults,
AVX state beyond the declared XMM views, CET configuration and exact platform
exceptions are not all tested by this witness.

## External calls and the smoke oracle are separate concerns

All 64 static CALL sites remain call boundaries. The earlier inventory reports
six visible internal targets, 56 uncaptured library targets and two indirect
sites across overlapping listings; that is not a dynamic call-frequency claim.
Relocations inside the object CALL encodings must be resolved before their
printed next-instruction placeholder becomes a destination. Calls and returns
also change stack memory and the execution index; ABI argument preservation is
not supplied merely by a symbol name.

The original C smoke harness tests `fabs(error) > tolerance` without an
explicit finite-value test. A NaN makes that comparison false, so that predicate
cannot by itself reject a NaN coefficient when the rank check passes. This is
a source-level acceptance gap, not a claim that the captured finite sample
produced NaN. Independent numeric acceptance must reject nonfinite outputs.
The ARM softfp verifier separately does so. The original Fortran algorithm is
not the oracle for any instruction meaning in this audit.

## Reproduction and final disposition

Run `verify-audit.mjs` through Node on Linux x86-64 with GNU `as`, `ld`
and `objdump` available. It checks all 2,835 independently decoded records,
executes the 22 cases, rejects the old oracle, and rejects deletion or promotion
of a defective audit row. The existing four-file crosswalk also passes all of
its byte/record mutation fixtures; this confirms that the semantic defect was
not detected by structural testing.

The canonical Idriç pure-rule attempt is preserved beside the diagnostic
assembly. Its check failed because that compiler is not bootstrapped in this
environment. The small Node verifier is a documented fallback and neither its
success nor native assembly execution is an Idriç/EMC compiler result.

**SEMANTIC_ACCEPTANCE = FAIL.** The audit is complete as an independently
reproduced rejection with an exhaustive record inventory. Repairing the original
wording, completing the remaining state rules, full dynamic library tracing
and all-input equivalence remain separate work.
The audit workflow passes only when it preserves and reproduces this rejection.
