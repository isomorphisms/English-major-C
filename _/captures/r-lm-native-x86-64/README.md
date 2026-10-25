# Native x86-64 assembly reached by R's `lm()` numerical path

**Status (2026-10-11): reference material only.** This directory preserves conventional, untranslated x86-64 disassembly. It is an input for a *future* English Major C / Lawyer Assembly translation exercise. No English-language assembly has been written here.

## Exactly what was executed

The ordinary R expression `lm(y ~ x)` constructs a model frame and a design matrix before `stats::lm.fit()` calls C routine `Cdqrls`, which reaches the Fortran QR-based routines `dqrls`, `dqrdc2`, and `dqrsl`.

The **R interpreter was not installed** for this experiment: `lm(y ~ x)` itself was **not executed inside R**. Instead, the standalone `call_r_qr.c` harness called the actual Fortran `dqrls_` entry point compiled from R sources. This directory contains that harness, its input sources, compiled objects, test output, and assembly listings as individually inspectable files.

The objective actually computed by ordinary `lm` is the sum of **squared vertical residuals**. This is **not** the stretch-goal objective in [issue #4](https://github.com/dilapidated-shed/English-major-C/issues/4), which is the sum of **unsquared shortest perpendicular distances** to any planar line, including vertical lines. Do not conflate the two.

## Contents

| File | Meaning |
| --- | --- |
| `dqrls.f`, `dqrdc2.f`, `dqrsl.f` | Fortran routine source used in the captured build, taken from R and stripped of comments and blank lines; see provenance below |
| `call_r_qr.c` | Standalone C test harness that calls the R Fortran routines; not R's C glue layer |
| `model_example.R` | Illustrative R-language input, not a record of having run an R interpreter |
| `dqrls.o`, `dqrdc2.o`, `dqrsl.o` | Original compiled x86-64 object files, retained without modification |
| `call_r_qr` | Original linked x86-64 harness executable (not an official R binary) |
| `linked-executable.x86-64.disasm.txt` | Complete recorded disassembly of that executable, excluding dynamically loaded library internals |
| `README.txt`, `test-output.txt`, `sha256sums.txt` | Original experiment notes, recorded test output, and checksums of native artifacts |
| `dqrls.x86-64.disasm.txt` | Byte-for-byte copy of the original routine disassembly, with calls and relocations |
| `dqrdc2.x86-64.disasm.txt` | Byte-for-byte copy of the original QR-factorization routine disassembly |
| `dqrsl.x86-64.disasm.txt` | Byte-for-byte copy of the original least-squares solution routine disassembly |
| `COPYING-R.txt` | GNU General Public License version 2, as distributed with R; the included Fortran source retains R's upstream GPL licensing |

All 16 original experiment files are present directly in this directory as separate files. Each original file's Git blob identity was checked against its pre-extraction identity. No object file or executable is claimed to be an official R build.

## Build and inspection environment

- Target host: x86-64, Debian GNU/Linux 13.
- Compilers used: GNU Fortran 14.2.0 and GCC 14.2.0.
- Build flags: `gfortran -O2 -g -fno-inline -fPIC` for the Fortran objects.
- Assembly tool: GNU `objdump -dr -M intel` on individual objects; `objdump -d -M intel` for the linked executable.
- External BLAS and language-runtime shared-library machine instructions are **not** included in the linked-executable listing.
- The included Fortran build inputs reproduce code extracted from R sources with comments and blank lines removed; upstream source history, notices, and full commentary should be read at the links below.

To inspect / reproduce on a host with GCC, GFortran, BLAS, and the relevant runtime libraries:

```sh
gfortran -O2 -g -fno-inline -fPIC -c dqrls.f dqrdc2.f dqrsl.f
cc -O2 -g -Wall -Wextra call_r_qr.c dqrls.o dqrdc2.o dqrsl.o \
  -lblas -lgfortran -lm -o call_r_qr
./call_r_qr

objdump -dr -M intel --disassemble=dqrls_ dqrls.o
objdump -dr -M intel --disassemble=dqrdc2_ dqrdc2.o
objdump -dr -M intel --disassemble=dqrsl_ dqrsl.o
```

The build above is a record of a completed *historical* native-GCC experiment, not a proposal to replace the project's ICK/NDK build policy with GCC. It is specific to the stated host and toolchain; other compilers, revisions, flags, and linking configurations can produce different instructions.

## Numerical smoke test recorded in `test-output.txt`

- Input: x = (0,1,2,3,4,5); y = (1,2,2,4,4,6).
- Model matrix: intercept column of ones followed by x.
- Rank: 2.
- Intercept: 0.809523809523811, expected 17/21.
- Slope: 0.942857142857143, expected 33/35.
- Sum of squared vertical errors: 1.27619047619048.
- Harness exit status: 0.

This verifies one standalone numerical case; it does not establish interpreter integration, completeness, mathematical correctness in all inputs, or execution of the future geometric-distance goal.

## Artifact identities (SHA-256)

```
968488c7e15ab89373587fa66e65fffc62cdc92bccca2e9d63c40728d69910f2  dqrls.x86-64.disasm.txt
1d39427ac5b32ddab7a22a303150cb9c8e29b2fa03df49f81ba88d39be58e0c4  dqrdc2.x86-64.disasm.txt
ce2660259bd9dd68a76f1e00b9082c6a92d2d04071686ff97543e0386fed25fe  dqrsl.x86-64.disasm.txt
```

All original compiled object, executable, and linked-executable-disassembly SHA-256 values are recorded in `sha256sums.txt`. To check the extracted files in this directory, run `sha256sum -c sha256sums.txt`; this succeeded on the original extracted artifacts.

## Source provenance and licenses

R Core Team / R source, retrieved from `wch/r-source` `trunk`:

- [`src/appl/dqrls.f`](https://github.com/wch/r-source/blob/trunk/src/appl/dqrls.f), Git blob `c5c78ecb11db7bfe2ad78b57291720952f9cf0d8`.
- [`src/appl/dqrdc2.f`](https://github.com/wch/r-source/blob/trunk/src/appl/dqrdc2.f), Git blob `29304f549daa2b37797dbc86c86672d708c82522`.
- [`src/appl/dqrsl.f`](https://github.com/wch/r-source/blob/trunk/src/appl/dqrsl.f), Git blob `2964e8c2ec6f7c854dbe633971fb48465b76d302`.
- [R's GPL license](https://github.com/wch/r-source/blob/trunk/COPYING), upstream blob `3912109b5cd65a68039d473c11c9f7ac2303e06d`.

See `README.txt` for the original experimental notes and `sha256sums.txt` for the original native outputs.

**Next step (not performed):** inspect this unchanged traditional assembly and decide the level of English-language instructions that should describe it. The higher-level geometric fitting algorithm is a separate question.
