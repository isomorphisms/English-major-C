@ Compiled from the English Major C source; source line numbers are retained.
@ The input is an ARMv7-A Thumb program, not R code and not ICK output.
.syntax unified
.arch armv7-a
.thumb
.text
.global english_identity_create
.type english_identity_create, %function
.thumb_func
english_identity_create:
    push {r4-r6, lr}
    @ English line 12: Push registers four through six and the link register onto the descending stack.
    mov.w r4, r0
    @ English line 13: Copy "argument or allocated identity" into "sentinel" without changing the condition flags.
    mov.w r5, r1
    @ English line 14: Copy "id argument or source cursor" into "requested id" without changing the condition flags.
    mov.w r6, r2
    @ English line 15: Copy "name argument or destination cursor" into "original name" without changing the condition flags.
    bl english_identity_find
    @ English line 16: Call the function named "english_identity_find" and put the return address into the link register.
    cmp r0, #0
    @ English line 17: Compare "argument or allocated identity" with zero and update the condition flags.
    beq.n english_instruction_allocate_an_identity
    @ English line 18: If the zero flag is one, replace the execution index with the instruction named "allocate an identity".
    movw r0, #1
    @ English line 19: Put 1 into the low sixteen bits of "argument or allocated identity" and zero into its high sixteen bits.
    b.n english_instruction_return_creation_status
    @ English line 20: Replace the execution index with the instruction named "return creation status".
english_instruction_allocate_an_identity:
    @ English line 22: Name the following instruction "allocate an identity".
    movw r0, #36
    @ English line 23: Put 36 into the low sixteen bits of "argument or allocated identity" and zero into its high sixteen bits.
    bl identity_allocate_kernel
    @ English line 24: Call the function named "identity_allocate_kernel" and put the return address into the link register.
    cmp r0, #0
    @ English line 25: Compare "argument or allocated identity" with zero and update the condition flags.
    beq.n english_instruction_allocation_failed
    @ English line 26: If the zero flag is one, replace the execution index with the instruction named "allocation failed".
    mov.w r12, #0
    @ English line 28: Put zero into "byte value or old first link" without changing the condition flags.
    str.w r12, [r0, #0]
    @ English line 29: Store exactly four bytes from "byte value or old first link" at 0 bytes beyond the address in "argument or allocated identity".
    str.w r12, [r0, #4]
    @ English line 30: Store exactly four bytes from "byte value or old first link" at 4 bytes beyond the address in "argument or allocated identity".
    str.w r12, [r0, #8]
    @ English line 31: Store exactly four bytes from "byte value or old first link" at 8 bytes beyond the address in "argument or allocated identity".
    str.w r12, [r0, #12]
    @ English line 32: Store exactly four bytes from "byte value or old first link" at 12 bytes beyond the address in "argument or allocated identity".
    str.w r12, [r0, #16]
    @ English line 33: Store exactly four bytes from "byte value or old first link" at 16 bytes beyond the address in "argument or allocated identity".
    strb.w r12, [r0, #24]
    @ English line 34: Store the low byte of "byte value or old first link" at 24 bytes beyond the address in "argument or allocated identity".
    str.w r5, [r0, #20]
    @ English line 35: Store exactly four bytes from "requested id" at 20 bytes beyond the address in "argument or allocated identity".
    mov.w r1, r6
    @ English line 36: Copy "original name" into "id argument or source cursor" without changing the condition flags.
    mov.w r2, r0
    @ English line 37: Copy "argument or allocated identity" into "name argument or destination cursor" without changing the condition flags.
    movw r3, #19
    @ English line 38: Put 19 into the low sixteen bits of "remaining capacity or new link" and zero into its high sixteen bits.
english_instruction_copy_another_name_byte:
    @ English line 40: Name the following instruction "copy another name byte".
    cmp r3, #0
    @ English line 41: Compare "remaining capacity or new link" with zero and update the condition flags.
    beq.n english_instruction_insert_at_the_front
    @ English line 42: If the zero flag is one, replace the execution index with the instruction named "insert at the front".
    ldrb.w r12, [r1]
    @ English line 43: Load the byte at the address in "id argument or source cursor" into "byte value or old first link" and zero its upper bits.
    cmp r12, #0
    @ English line 44: Compare "byte value or old first link" with zero and update the condition flags.
    beq.n english_instruction_insert_at_the_front
    @ English line 45: If the zero flag is one, replace the execution index with the instruction named "insert at the front".
    strb.w r12, [r2, #0]
    @ English line 46: Store the low byte of "byte value or old first link" at 0 bytes beyond the address in "name argument or destination cursor".
    addw r1, r1, #1
    @ English line 47: Add 1 to "id argument or source cursor" and put the result into "id argument or source cursor" without changing the condition flags.
    addw r2, r2, #1
    @ English line 48: Add 1 to "name argument or destination cursor" and put the result into "name argument or destination cursor" without changing the condition flags.
    sub.w r3, r3, #1
    @ English line 49: Decrease "remaining capacity or new link" by one without changing the condition flags.
    b.n english_instruction_copy_another_name_byte
    @ English line 50: Replace the execution index with the instruction named "copy another name byte".
english_instruction_insert_at_the_front:
    @ English line 52: Name the following instruction "insert at the front".
    addw r3, r0, #28
    @ English line 53: Add 28 to "argument or allocated identity" and put the result into "remaining capacity or new link" without changing the condition flags.
    ldr.w r12, [r4]
    @ English line 54: Load exactly four bytes from the address in "sentinel" into "byte value or old first link".
    str.w r3, [r12, #4]
    @ English line 55: Store exactly four bytes from "remaining capacity or new link" at 4 bytes beyond the address in "byte value or old first link".
    str.w r12, [r3, #0]
    @ English line 56: Store exactly four bytes from "byte value or old first link" at 0 bytes beyond the address in "remaining capacity or new link".
    str.w r4, [r3, #4]
    @ English line 57: Store exactly four bytes from "sentinel" at 4 bytes beyond the address in "remaining capacity or new link".
    str.w r3, [r4, #0]
    @ English line 58: Store exactly four bytes from "remaining capacity or new link" at 0 bytes beyond the address in "sentinel".
    mov.w r0, r5
    @ English line 59: Copy "requested id" into "argument or allocated identity" without changing the condition flags.
    mov.w r1, r6
    @ English line 60: Copy "original name" into "id argument or source cursor" without changing the condition flags.
    bl identity_created
    @ English line 61: Call the function named "identity_created" and put the return address into the link register.
    mov.w r0, #0
    @ English line 62: Put zero into "argument or allocated identity" without changing the condition flags.
    b.n english_instruction_return_creation_status
    @ English line 63: Replace the execution index with the instruction named "return creation status".
english_instruction_allocation_failed:
    @ English line 65: Name the following instruction "allocation failed".
    movw r0, #2
    @ English line 66: Put 2 into the low sixteen bits of "argument or allocated identity" and zero into its high sixteen bits.
english_instruction_return_creation_status:
    @ English line 67: Name the following instruction "return creation status".
    pop.w {r4-r6, lr}
    @ English line 68: Pop registers four through six and the link register from the descending stack.
    bx lr
    @ English line 69: Replace the execution index with the instruction address in the link register.
.size english_identity_create, .-english_identity_create
