Traditional x86-64 assembly from R's native linear-model QR solver
=================================================================

Scope
-----
The R-language call lm(y ~ x) prepares a model matrix and passes the
unweighted problem to stats::lm.fit(), which calls Cdqrls, which calls
Fortran dqrls, dqrdc2, and dqrsl.

The R interpreter is not installed in the local build environment.
Therefore the actual R command lm(y ~ x) was NOT run in R here. A
standalone harness called genuine R Fortran QR source directly. This
is the numerical native computation used by lm(), not the R-language
frontend or its native C glue code Cdqrls.

Sample
------
x = (0,1,2,3,4,5)
y = (1,2,2,4,4,6)
model matrix columns: intercept (ones), x
fitted intercept: 0.809523809523811 (17/21)
fitted slope:     0.942857142857143 (33/35)
rank: 2
sum squared vertical residuals: 1.27619047619048
harness exit code: 0

Compilation
-----------
Host: Debian GNU/Linux 13, x86-64
Compilers: GNU Fortran 14.2.0, GCC 14.2.0
Flags: gfortran -O2 -g -fno-inline -fPIC
Disassembler: GNU objdump, Intel syntax (-M intel), with relocation info (-r).
The disassembly is build-specific; it is not a claim about the official
R distribution binaries or their exact machine instructions.

Commands used
-------------
gfortran -O2 -g -fno-inline -fPIC -c dqrls.f dqrdc2.f dqrsl.f
cc -O2 -g -Wall -Wextra call_r_qr.c dqrls.o dqrdc2.o dqrsl.o \
  -lblas -lgfortran -lm -o call_r_qr
./call_r_qr
objdump -dr -M intel --disassemble=dqrls_ dqrls.o > dqrls.x86-64.disasm.txt
objdump -dr -M intel --disassemble=dqrdc2_ dqrdc2.o > dqrdc2.x86-64.disasm.txt
objdump -dr -M intel --disassemble=dqrsl_ dqrsl.o > dqrsl.x86-64.disasm.txt
objdump -d -M intel call_r_qr > linked-executable.x86-64.disasm.txt

Files
-----
dqrls.x86-64.disasm.txt: actual instructions for R's dqrls solver
  (calls dqrdc2 and dqrsl)
dqrdc2.x86-64.disasm.txt: actual instructions for QR factorization
dqrsl.x86-64.disasm.txt: actual instructions for solving using QR
linked-executable.x86-64.disasm.txt: entire linked executable,
  including C harness; external BLAS and runtime library instructions
  reside in dynamically linked libraries and are not included.
dqrls.f, dqrdc2.f, dqrsl.f: executable Fortran source copied from
  R upstream, with comment and blank lines removed. See provenance.
call_r_qr.c: standalone test harness, not the R interpreter.

Provenance and licensing
------------------------
R Core Team, R source trunk at wch/r-source, paths:
https://github.com/wch/r-source/blob/trunk/src/appl/dqrls.f
https://github.com/wch/r-source/blob/trunk/src/appl/dqrdc2.f
https://github.com/wch/r-source/blob/trunk/src/appl/dqrsl.f
Git blob SHAs at retrieval:
dqrls.f:  c5c78ecb11db7bfe2ad78b57291720952f9cf0d8
dqrdc2.f: 29304f549daa2b37797dbc86c86672d708c82522
dqrsl.f:  2964e8c2ec6f7c854dbe633971fb48465b76d302
The Fortran source comes from GNU R and retains its upstream GPL
licensing. R sources refer to GPL-2-or-later and licensing notices.

No English Major C or Lawyer Assembly translation has been attempted.
