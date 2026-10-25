# Linux x86-64 freestanding test fixture (separate from the English program).
# No libc or dynamic loader: invoke the Linux exit syscall directly.
# This fixture is not an English Major C language feature or an ABI oracle.
.intel_syntax noprefix
.section .text
.global _start
.type _start, @function
_start:
    lea rdi, [rip + sample_four]
    mov esi, 4
    call add_all_known_entries_x86_64
    cmp eax, 14
    jne wrong_result

    lea rdi, [rip + sample_four]
    xor esi, esi
    call add_all_known_entries_x86_64
    test eax, eax
    jne wrong_result

    lea rdi, [rip + sample_all_unknown]
    mov esi, 2
    call add_all_known_entries_x86_64
    test eax, eax
    jne wrong_result

    lea rdi, [rip + sample_known_zero]
    mov esi, 3
    call add_all_known_entries_x86_64
    cmp eax, 5
    jne wrong_result

    lea rdi, [rip + sample_wraparound]
    mov esi, 2
    call add_all_known_entries_x86_64
    cmp eax, 2
    jne wrong_result

    lea rdi, [rip + sample_only_unknown]
    mov esi, 1
    call add_all_known_entries_x86_64
    test eax, eax
    jne wrong_result

    xor edi, edi
    mov eax, 60
    syscall

wrong_result:
    mov edi, 1
    mov eax, 60
    syscall

.section .rodata
.balign 4
sample_four:
    .long 4, 7, 0xffffffff, 3
sample_all_unknown:
    .long 0xffffffff, 0xffffffff
sample_known_zero:
    .long 0, 0xffffffff, 5
sample_wraparound:
    .long 0xfffffffe, 4
sample_only_unknown:
    .long 0xffffffff
