# Conventional 32-bit ARM disassembly of the native numerical QR path used by R `lm()`

**Status: captured traditional machine instructions. The separate [softfp execution package](softfp-execution/README.md) now executes these exact archived objects under QEMU Linux ARM.** No executable English translation or physical-device execution is claimed.

This artifact repeats the existing [x86-64 standalone R QR experiment](../r-lm-native-x86-64/README.md) using the **same three R-sourced Fortran routine inputs**: `dqrls.f`, `dqrdc2.f`, and `dqrsl.f`, inherited unchanged from [the x86 archive PR #5](https://github.com/dilapidated-shed/English-major-C/pull/5). They remain in `../r-lm-native-x86-64/`; no copied or independently modified source is represented as R upstream.

The ordinary R call `lm(y ~ x)` ultimately uses `lm.fit` → `Cdqrls` → `dqrls` → `dqrdc2`/`dqrsl`. The R interpreter, its full C glue, BLAS implementation, and Android runtime **were not compiled or run here**. This is genuinely generated ARM assembly for the numerical routines, not an official R executable.

## Target and extraction

- ISA: **ARMv7-A, A32 (ARM state, not Thumb/T32)**.
- Floating point: **VFPv3-D16 instructions** and **softfp** calling convention (not hard-float parameter passing).
- Object format: **ELF32 little-endian ARM**, GNU EABI version 5; an **unlinked object** for each routine.
- Toolchain: `arm-linux-gnueabihf-gfortran-14` (**GNU Fortran 14.2.0**, Ubuntu 24.04 package 14.2.0-4ubuntu2~24.04.1) and ARM `objdump` (**GNU Binutils 2.42**).
- Host: Ubuntu 24.04 x86-64 GitHub Actions cross-compilation; captured original [build run 38202970843](https://github.com/dilapidated-shed/English-major-C/actions/runs/38202970843) from source revision `2cb1fcae88fde81af16a54e5f4d0b46086585da8`.
- Compiler options: `-O2 -g -fno-inline -fPIC -march=armv7-a -marm -mfpu=vfpv3-d16 -mfloat-abi=softfp`.
- Inspection: `arm-linux-gnueabihf-objdump -dr --disassemble=<routine>_ <routine>.o` (raw encoded instruction words and relocations).
- Full header/attribute evidence in [capture-environment.txt](capture-environment.txt). `Tag_THUMB_ISA_use: Thumb-2` in ELF attributes describes a supported CPU capability; the **produced routine instructions use A32**, as selected by `-marm` and shown by decoding.
- `-mfloat-abi=softfp` was explicitly requested of the cross-compiler; these are **GNU/Linux EABI object files**, not Android NDK artifacts. No Android compatibility or on-device behavior is asserted.
  
## Files

| Name | Captured evidence |
| --- | --- |
| [dqrls.armv7-a32.disasm.txt](../../../arm/a32/r-qr/dqrls.armv7-a32.disasm.txt) | Authentic driver disassembly, raw hex, relocation records |
| [dqrdc2.armv7-a32.disasm.txt](../../../arm/a32/r-qr/dqrdc2.armv7-a32.disasm.txt) | Authentic QR-factorization disassembly and relocations |
| [dqrsl.armv7-a32.disasm.txt](../../../arm/a32/r-qr/dqrsl.armv7-a32.disasm.txt) | Authentic QR-solution disassembly and relocations |
| `dqrls.armv7-a32.o`, `dqrdc2.armv7-a32.o`, `dqrsl.armv7-a32.o` | Original actual cross-compiled ELF objects |
| [capture-environment.txt](capture-environment.txt) | Exact compiler versions, target ELF headers, ABI attributes and flags |
| [SHA256SUMS](SHA256SUMS) | SHA-256 identities of all seven captured files |

The three ordinary disassembly files contain **131**, **442**, and **576** printed instruction lines, respectively (excluding `.word` data entries), including direct branch-and-link instructions. An object relocation names a required external routine; it does not contain or prove that routine's uninspected machine code. The output is not an execution trace.

## Rebuild with the same ARM cross tools

From the parent x86 archive directory, with the named cross compiler and binutils installed:

```sh
for routine in dqrls dqrdc2 dqrsl; do
  arm-linux-gnueabihf-gfortran-14 -O2 -g -fno-inline -fPIC \
    -march=armv7-a -marm -mfpu=vfpv3-d16 -mfloat-abi=softfp \
    -c "${routine}.f" -o "${routine}.armv7-a32.o"
  arm-linux-gnueabihf-objdump -dr --disassemble="${routine}_" \
    "${routine}.armv7-a32.o" > "${routine}.armv7-a32.disasm.txt"
done
```

The archived objects' hashes can vary if build directories, compiler revision or debug information differ. The captured exact bytes are in this directory, with `sha256sum -c SHA256SUMS` as the byte-identity check; the original workflow also uploaded these artifacts.

## What this result does not establish

1. It does not execute the R interpreter or its `lm()` C entry point; it captures the source used by their numerical path.
2. It does not include dynamically linked BLAS, Fortran-runtime, or mathematical-library instructions. Calls are recorded as boundaries.
3. This original object capture alone does not demonstrate execution. The [EMC-2 softfp follow-up](softfp-execution/README.md) separately demonstrates Linux ARM QEMU execution and numerical output using these objects; physical MIRO A1/Android acceptance remains unproven.
4. It does not translate assembly into English Major C/Fortran/assembly, establish instruction-by-instruction semantics, or qualify the ICK/NDK build path.
5. Ordinary R `lm` minimizes **squared vertical residuals**, distinct from the earlier proposed **sum of unsquared perpendicular distances** line-fitting problem.
6. This is a **one-off research capture**, not a Flexible Pipes assignment or a maintained ICK/NDK production build. Its project-specific GitHub Actions checks verify archived object bytes, disassembly, and deliberately corrupted artifacts. No separate ai-ci QR acceptance test is required.

R source provenance and GPL licensing remain recorded in [the original archive](../r-lm-native-x86-64/README.md) and [its license copy](../../../fortran/COPYING-R.txt). This directory is preserved as raw, bottom-up machine evidence only.
