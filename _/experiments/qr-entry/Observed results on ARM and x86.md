# Observed QR entry execution: ARM and x86-64

## Verified experiment

On 2026-10-12, the exact source revision
`da3a615fe0c2876c22002f4115adf738a5dd84fd` passed
[run 38207245042 — Execute English QR entry semantics against original machine bytes](https://github.com/dilapidated-shed/English-major-C/actions/runs/38207245042).
The tested implementation is in [PR #10 — Describe every recorded ARM A32 QR machine instruction in English](https://github.com/dilapidated-shed/English-major-C/pull/10).
This note records that completed run; a later commit containing this note
is not retroactively the source revision used in that run.

| Actual original QR entry | Instructions compared per case | Initial states | Result |
| --- | ---: | ---: | --- |
| ARM A32 `dqrls`, before its first call at offset `0x5c` | 23 | 7 | Every compared state matched |
| x86-64 `dqrls`, before its first call at offset `0x75` | 31 | 7 | Every compared state matched |

The two ordinary-English source files were interpreted independently of
the disassembly mnemonics. QEMU executed unchanged instruction bytes
extracted from the original, checksum-pinned ELF objects. A diagnostic
ELF load envelope supplied the declared memory map; no replacement C or
Fortran implementation was compiled. No unresolved call was executed.

After each instruction the test compared **all general-purpose registers,
the execution index, defined integer arithmetic flags, and all 12,288
bytes of the declared workspace**, including incoming and outgoing stack
arguments. That is 378 positive prefix instruction transitions across the
two architectures. Floating/vector registers and unselected control bits
were not compared. The x86 auxiliary-carry bit was excluded after XOR/TEST
because it is undefined for those instructions.

The seven `(n,p)` pairs were `(6,2)`, `(0,0)`, `(-3,2)`, `(6,-2)`,
`(-3,-2)`, `(-2147483648,2147483647)`, and
`(2147483647,-2147483648)`. Negative dimensions probe only these bounded
entry instructions; they are not declared valid inputs to the complete
Fortran QR routine. Each final state prepared exactly the nine argument
addresses `x,n,n,p,tol,k,qraux,jpvt,work` under its own calling convention.

## Deliberately incorrect meanings were rejected

The recorded failures below are explicit register or status mismatches,
not debugger crashes, missing tools, timeouts, or missing output:

- ARM native instruction changed from `MOV R6,R3` to `MOV R6,R2`:
  rejected at step 2, expected R6=`0x20300`, observed R6=`0x20204`.
- ARM English sentence changed to copy the wrong register:
  rejected at step 2, English R6=`0x20204`, original machine R6=`0x20300`.
- x86 native XOR changed to OR:
  rejected at step 2, expected RAX=`0`, observed RAX=`1`.
- x86 English zeroing sentence replaced by a register copy:
  rejected at step 2, English RAX=`0xabcdef1200010102`, machine RAX=`0`.
- Thumb BLX falsely modeled as remaining in Thumb state:
  rejected on the instruction-set-state bit after that actual branch.

## Complete linked ARM byte/mode inventory, plus one executed transition

ELF mapping symbols and original bytes identify **1,369 A32 instruction
records, 68 Thumb instruction records, and 49 displayed literal-data
records** in the archived linked ARM executable. The inventory accounts
for all **5,844 bytes** of its executable sections, including two omitted
eight-byte zero-data ranges at addresses `0x8d8` and `0x1308`.
Each displayed Thumb instruction's length was checked against its leading
halfword; data was not relabeled as instructions. This is byte/mode
coverage, not full instruction-semantic validation of that linked image.

The actual four Thumb bytes `ff f7 74 ee` at linked address `0x940`
were then executed separately. The BLX target decoded to `0x62c`, an
A32-mapped address. QEMU changed the execution index to that target,
cleared CPSR.T, and stored the tagged Thumb return address in LR, exactly
as the independently computed transition required. The entire relevant
code layout was rebased together in a diagnostic image, preserving the
relative branch displacement. No called library instructions executed.

## Preserved receipt and trace identities

- QEMU ARM and x86: `8.2.2`, Ubuntu package `1:8.2.2+ds-0ubuntu1.18`.
- GDB: `15.1`, Ubuntu package `15.1-1ubuntu1~24.04.1`.
- [Run artifact 11728081563](https://github.com/dilapidated-shed/English-major-C/actions/runs/38207245042/artifacts/11728081563): 552 files containing source-state receipts, per-instruction register records, workspace dumps, original-byte diagnostic images, debugger logs and complete linked-mode JSON/TSV.
- Downloaded ZIP SHA-256 independently checked:
  `af58f08f4c09db4a06fb5b3a8cbc305756b3bc1f9a62277b04fc1494c6d5f7f6`.
- GitHub artifact retention was set to 14 days. This durable note and the
  interpreter/checker source remain in the repository after that artifact
  expires; rerunning regenerates the detailed evidence.

The first runs exposed three mistakes in the new capture harness:
quoted filenames were interpreted literally by GDB restore/dump,
32-bit ARM registers were sign-extended when printed directly as 64-bit
integers, and GDB's structured x86 flags type rejected an integer cast.
Those capture defects were corrected without changing the English state
expectations. The negative and extreme-value cases remain in the test.

## Not yet completed

The executable English still stops before the first `dqrdc2` call.
Neither full QR decomposition, floating-point rounding/exception semantics,
callee execution nor external BLAS is implemented by this interpreter.
The earlier numerical QR smoke tests remain separate evidence. The linked
ARM mode inventory is not a complete English translation of every linked
instruction. No physical-device or general-language correctness claim is
made, and this result does not authorize merging the unfinished PR.
