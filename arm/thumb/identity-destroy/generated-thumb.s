@ Compiled from the English Major C source; source line numbers are retained.
@ The input is an ARMv7-A Thumb program, not R code and not ICK output.
.syntax unified
.arch armv7-a
.thumb
.text
.global english_identity_destroy
.type english_identity_destroy, %function
.thumb_func
english_identity_destroy:
    push {r4, lr}
    @ English line 8: Push register four and the link register onto the descending stack.
    bl english_identity_find
    @ English line 9: Call the function named "english_identity_find" and put the return address into the link register.
    cmp r0, #0
    @ English line 10: Compare "sentinel or containing identity" with zero and update the condition flags.
    beq.n english_instruction_finish_deletion
    @ English line 11: If the zero flag is one, replace the execution index with the instruction named "finish deletion".
    ldr.w r1, [r0, #28]
    @ English line 13: Load exactly four bytes from 28 bytes beyond the address in "sentinel or containing identity" into "requested id or successor link".
    ldr.w r2, [r0, #32]
    @ English line 14: Load exactly four bytes from 32 bytes beyond the address in "sentinel or containing identity" into "predecessor link".
    str.w r2, [r1, #4]
    @ English line 15: Store exactly four bytes from "predecessor link" at 4 bytes beyond the address in "requested id or successor link".
    str.w r1, [r2, #0]
    @ English line 16: Store exactly four bytes from "requested id or successor link" at 0 bytes beyond the address in "predecessor link".
    movw r3, #256
    @ English line 17: Put 256 into the low sixteen bits of "retired link marker" and zero into its high sixteen bits.
    str.w r3, [r0, #28]
    @ English line 18: Store exactly four bytes from "retired link marker" at 28 bytes beyond the address in "sentinel or containing identity".
    movw r3, #290
    @ English line 19: Put 290 into the low sixteen bits of "retired link marker" and zero into its high sixteen bits.
    str.w r3, [r0, #32]
    @ English line 20: Store exactly four bytes from "retired link marker" at 32 bytes beyond the address in "sentinel or containing identity".
    bl identity_release
    @ English line 21: Call the function named "identity_release" and put the return address into the link register.
english_instruction_finish_deletion:
    @ English line 23: Name the following instruction "finish deletion".
    pop.w {r4, lr}
    @ English line 24: Pop register four and the link register from the descending stack.
    bx lr
    @ English line 25: Replace the execution index with the instruction address in the link register.
.size english_identity_destroy, .-english_identity_destroy
