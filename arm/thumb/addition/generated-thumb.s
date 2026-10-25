@ Compiled from the English Major C source; source line numbers are retained.
@ The input is an ARMv7-A Thumb program, not R code and not ICK output.
.syntax unified
.arch armv7-a
.thumb
.text
.global add_all_known_entries_in_a_sequence
.type add_all_known_entries_in_a_sequence, %function
.thumb_func
add_all_known_entries_in_a_sequence:
english_instruction_prepare_the_total:
    @ English line 9: Name the following instruction "prepare the total".
    mov.w r2, #0
    @ English line 10: Put zero into "running total" without changing the condition flags.
    movw r12, #65535
    @ English line 11: Put 65535 into the low sixteen bits of "unknown marker" and zero into its high sixteen bits.
    movt r12, #65535
    @ English line 12: Put 65535 into the high sixteen bits of "unknown marker" without changing its low sixteen bits.
english_instruction_check_whether_any_entries_remain:
    @ English line 14: Name the following instruction "check whether any entries remain".
    cmp r1, #0
    @ English line 15: Compare "number of entries remaining" with zero and update the condition flags.
    beq.n english_instruction_return_the_result
    @ English line 16: If the zero flag is one, replace the execution index with the instruction named "return the result".
    ldr.w r3, [r0]
    @ English line 17: Load exactly four bytes from the address in "address of the next entry" into "current entry".
    add.w r0, r0, #4
    @ English line 18: Increase "address of the next entry" by four without changing the condition flags.
    sub.w r1, r1, #1
    @ English line 19: Decrease "number of entries remaining" by one without changing the condition flags.
    cmp r3, r12
    @ English line 20: Compare "current entry" with "unknown marker" and update the condition flags.
    beq.n english_instruction_check_whether_any_entries_remain
    @ English line 21: If the zero flag is one, replace the execution index with the instruction named "check whether any entries remain".
    add.w r2, r2, r3
    @ English line 22: Add "current entry" to "running total" and keep only the lowest thirty-two result bits without changing the condition flags.
    b.n english_instruction_check_whether_any_entries_remain
    @ English line 23: Replace the execution index with the instruction named "check whether any entries remain".
english_instruction_return_the_result:
    @ English line 25: Name the following instruction "return the result".
    mov.w r0, r2
    @ English line 26: Copy "running total" into "address of the next entry" without changing the condition flags.
    bx lr
    @ English line 27: Replace the execution index with the instruction address in the link register.
.size add_all_known_entries_in_a_sequence, .-add_all_known_entries_in_a_sequence
