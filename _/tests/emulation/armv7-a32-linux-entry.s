@ Linux ARMv7-A A32 startup harness calling the separate Thumb function.
@ This fixture is not English Major C source. The numerical routine's
@ compiled Thumb instructions are from the original English compiler.
.syntax unified
.arch armv7-a
.arm
.text
.global _start
.type _start, %function
_start:
    ldr r0, =sample_four
    mov r1, #4
    blx add_all_known_entries_in_a_sequence
    cmp r0, #14
    bne wrong_result

    ldr r0, =sample_four
    mov r1, #0
    blx add_all_known_entries_in_a_sequence
    cmp r0, #0
    bne wrong_result

    ldr r0, =sample_all_unknown
    mov r1, #2
    blx add_all_known_entries_in_a_sequence
    cmp r0, #0
    bne wrong_result

    ldr r0, =sample_known_zero
    mov r1, #3
    blx add_all_known_entries_in_a_sequence
    cmp r0, #5
    bne wrong_result

    ldr r0, =sample_wraparound
    mov r1, #2
    blx add_all_known_entries_in_a_sequence
    cmp r0, #2
    bne wrong_result

    ldr r0, =sample_only_unknown
    mov r1, #1
    blx add_all_known_entries_in_a_sequence
    cmp r0, #0
    bne wrong_result

    mov r0, #0
    mov r7, #1
    svc #0

wrong_result:
    mov r0, #1
    mov r7, #1
    svc #0

.section .rodata
.balign 4
sample_four:
    .word 4, 7, 0xffffffff, 3
sample_all_unknown:
    .word 0xffffffff, 0xffffffff
sample_known_zero:
    .word 0, 0xffffffff, 5
sample_wraparound:
    .word 0xfffffffe, 4
sample_only_unknown:
    .word 0xffffffff
