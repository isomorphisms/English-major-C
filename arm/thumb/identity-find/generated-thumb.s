@ Compiled from the English Major C source; source line numbers are retained.
@ The input is an ARMv7-A Thumb program, not R code and not ICK output.
.syntax unified
.arch armv7-a
.thumb
.text
.global english_identity_find
.type english_identity_find, %function
.thumb_func
english_identity_find:
    ldr.w r2, [r0]
    @ English line 9: Load exactly four bytes from the address in "sentinel or returned identity" into "current link".
english_instruction_test_for_the_sentinel:
    @ English line 10: Name the following instruction "test for the sentinel".
    cmp r2, r0
    @ English line 11: Compare "current link" with "sentinel or returned identity" and update the condition flags.
    beq.n english_instruction_return_no_identity
    @ English line 12: If the zero flag is one, replace the execution index with the instruction named "return no identity".
    subw r12, r2, #28
    @ English line 13: Subtract 28 from "current link" and put the result into "containing identity" without changing the condition flags.
    ldr.w r3, [r12, #20]
    @ English line 14: Load exactly four bytes from 20 bytes beyond the address in "containing identity" into "current id".
    cmp r3, r1
    @ English line 15: Compare "current id" with "requested id" and update the condition flags.
    beq.n english_instruction_return_the_containing_identity
    @ English line 16: If the zero flag is one, replace the execution index with the instruction named "return the containing identity".
    ldr.w r2, [r2]
    @ English line 17: Load exactly four bytes from the address in "current link" into "current link".
    b.n english_instruction_test_for_the_sentinel
    @ English line 18: Replace the execution index with the instruction named "test for the sentinel".
english_instruction_return_the_containing_identity:
    @ English line 20: Name the following instruction "return the containing identity".
    mov.w r0, r12
    @ English line 21: Copy "containing identity" into "sentinel or returned identity" without changing the condition flags.
    bx lr
    @ English line 22: Replace the execution index with the instruction address in the link register.
english_instruction_return_no_identity:
    @ English line 23: Name the following instruction "return no identity".
    mov.w r0, #0
    @ English line 24: Put zero into "sentinel or returned identity" without changing the condition flags.
    bx lr
    @ English line 25: Replace the execution index with the instruction address in the link register.
.size english_identity_find, .-english_identity_find
