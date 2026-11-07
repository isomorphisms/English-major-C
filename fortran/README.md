# Fortran

The three R QR routines are here as individual source files.

| Source | Role |
| --- | --- |
| [dqrls.f](dqrls.f) | Calls the factorization and least-squares routines. |
| [dqrdc2.f](dqrdc2.f) | QR factorization with column pivoting. |
| [dqrsl.f](dqrsl.f) | Uses the factorization to calculate coefficients, residuals, and related quantities. |

Follow the same routines into [ARM assembly and English](../arm/a32/r-qr/)
or [x86-64 assembly and English](../x86/r-qr/).

[BLAS source](blas/) · [R example](model_example.R) · [R license](COPYING-R.txt)

[Original capture record](../_/captures/r-lm-native-x86-64/README.md)
