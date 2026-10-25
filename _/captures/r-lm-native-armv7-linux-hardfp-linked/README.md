# Linked ARMv7-A A32 R QR numerical harness, executed under Linux emulation

**Status: compiled, linked, disassembled and numerically executed under QEMU; this is not Android execution or the R interpreter.**

This repeats the **linked standalone harness** of the original [R x86-64 QR experiment](../r-lm-native-x86-64/README.md), using its unchanged source inputs: `call_r_qr.c`, `dqrls.f`, `dqrdc2.f` and `dqrsl.f`. The compiled QR routine sources come from R; the C harness invokes those routines directly. R `lm()` itself is **not** run here.

This additional target is **GNU/Linux ARMv7-A A32 using the hard-float ABI** (`-mfloat-abi=hard`) so that it can link against the ARM Linux Fortran and BLAS packages and run in QEMU. It is intentionally separate from the [ARM softfp disassembly archive](../r-lm-native-armv7-a32/README.md). **The hard-float objects must not be substituted for the Android-style softfp objects.**

## Captured inputs and toolchain

- Same R-derived numerical Fortran as [archived PR #5 — Preserve R lm QR native x86-64 disassembly as translation reference](https://github.com/dilapidated-shed/English-major-C/pull/5).
- GNU Fortran 14.2.0, cross GCC 14.2.0, GNU Binutils 2.42, A32 ARM state, VFPv3-D16, **hard-float** ABI.
- Flags for numerical Fortran: `-O2 -g -fno-inline -fPIC -march=armv7-a -marm -mfpu=vfpv3-d16 -mfloat-abi=hard`.
- Ubuntu 24.04 armhf `libblas3` and `libblas-dev`, versions **3.12.0-3build1.1**, linked dynamically. Their library machine instructions are **not part of** the linked executable disassembly.
- Linked ARM ELF32 executable ran under `qemu-arm` using ARM GNU/Linux libraries. Full version, ELF headers, hard-float ABI attributes (`Tag_ABI_VFP_args: VFP registers`) and dynamic library requirements are in [capture-environment.txt](capture-environment.txt).
- Original exact source revision for the captured run: `7fd477dc97bfd1efcc994bc2b2a708a05affb77d`; [GitHub Actions run 38203506383](https://github.com/dilapidated-shed/English-major-C/actions/runs/38203506383).
- SHA-256 source-of-truth archive: [SHA256SUMS](SHA256SUMS).

## Captured outputs

| File | Evidence |
| --- | --- |
| [linked-executable.armv7-hardfp.disasm.txt](../../../arm/a32/r-qr/hardfp/linked-executable.armv7-hardfp.disasm.txt) | Complete conventional ARM disassembly of the linked standalone executable, including its C caller, Fortran routines, and dynamic-link stubs |
| `call_r_qr.armv7-hardfp` | Original ELF32 executable that was run through QEMU |
| `call_r_qr.armv7-hardfp.o` | ARM object file for the original C test harness |
| `dqrls.armv7-hardfp.o`, `dqrdc2.armv7-hardfp.o`, `dqrsl.armv7-hardfp.o` | Three ARM hard-float Fortran objects that were linked together |
| [test-output.txt](test-output.txt) | Captured numerical output and zero exit status from ARM QEMU execution |
| [capture-environment.txt](capture-environment.txt) | Versions, compilation flags, ABI, ELF headers, dynamic requirements |
| [SHA256SUMS](SHA256SUMS) | Identity of all eight separately captured output files |

The disassembly and binary are **not a complete statically contained implementation**: the executable calls an external dynamically linked `libblas.so.3` and other runtime libraries. Their instruction bodies are not archived. No instruction is translated into ordinary English here; the intended workflow remains strictly bottom-up.

## Recorded numerical outcome

Harness input: `x=(0,1,2,3,4,5)`, `y=(1,2,2,4,4,6)`; intercept and slope columns.

```text
sample: x=(0,1,2,3,4,5); y=(1,2,2,4,4,6)
rank=2
intercept=0.809523809523811
slope=0.942857142857143
sum_of_squared_vertical_errors=1.27619047619048
exit_status=0
```

The intercept equals 17/21 and slope equals 33/35 to rounding. The numerical result matches the archived standalone x86-64 experiment. This is **one observed example**; it does not qualify every branch or exceptional floating-point case.

## Limits and acceptance

This is Linux ARM **hard-float**, not Android `armeabi-v7a` softfp; it does not establish physical MIRO A1 compatibility. The original R interpreter and `Cdqrls` glue layer were not executed. R `lm` is vertical least squares, distinct from the proposed unsquared perpendicular-distance line fitting exercise.

The GNU Fortran cross-build is a historical upstream behavior observation, not qualification of maintained ICK/NDK consumer compilation. **This is a one-off research experiment, not a Flexible Pipes job**, and ai-ci does not have a specific QR-disassembly acceptance test. The archive's own GitHub Actions checks verify object/disassembly integrity and the recorded numerical result against an independent oracle, including negative corruption cases. R's upstream GPL license is retained in [the original source archive](../../../fortran/COPYING-R.txt).
