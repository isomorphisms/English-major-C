# Diagnostic native Linux x86-64 witness. Specimen instructions use exact
# bytes from the archived QR listings, not a new compiler's chosen encoding.
# Each case sets its own preconditions. Nonzero exit identifies a failed case.
# --defsym OLD_FALSE_BRANCH_CLAIM=1 selects the erroneous whole-register oracle.
.intel_syntax noprefix
.global _start
.section .text
.macro expect_register actual, expected
    movabs rdx, \expected
    cmp \actual, rdx
    jne failed_case
.endm
.macro expect_flags mask, expected
    pushfq
    pop rax
    and eax, \mask
    cmp eax, \expected
    jne failed_case
.endm
_start:
    # 1: cmovle esi,r8d, false. Old RSI's low word survives; high word clears.
    mov edi, 1
    movabs rsi, 0xdeadbeef12345678
    mov r8d, 0x76543210
    mov eax, 2
    cmp eax, 1
    .byte 0x41,0x0f,0x4e,0xf0
.ifdef OLD_FALSE_BRANCH_CLAIM
    expect_register rsi, 0xdeadbeef12345678
.else
    expect_register rsi, 0x12345678
.endif

    # 2: the same bytes, true; condition flags must be preserved.
    mov edi, 2
    movabs rsi, 0xdeadbeef12345678
    mov r8d, 0x76543210
    xor eax, eax
    .byte 0x41,0x0f,0x4e,0xf0
    expect_flags 0x8d5, 0x44
    expect_register rsi, 0x76543210

    # 3/4: cmovle eax,r8d false and true.
    mov edi, 3
    movabs rax, 0xdeadbeef12345678
    mov r8d, 0x76543210
    mov ecx, 2
    cmp ecx, 1
    .byte 0x41,0x0f,0x4e,0xc0
    mov r12, rax
    expect_register r12, 0x12345678
    mov edi, 4
    movabs rax, 0xdeadbeef12345678
    xor ecx, ecx
    .byte 0x41,0x0f,0x4e,0xc0
    mov r12, rax
    expect_flags 0x8d5, 0x44
    expect_register r12, 0x76543210

    # 5/6: cmovg r11d,edx false and true.
    mov edi, 5
    movabs r11, 0xdeadbeef12345678
    mov edx, 0x76543210
    xor eax, eax
    .byte 0x44,0x0f,0x4f,0xda
    expect_register r11, 0x12345678
    mov edi, 6
    movabs r11, 0xdeadbeef12345678
    mov edx, 0x76543210
    mov eax, 2
    cmp eax, 1
    .byte 0x44,0x0f,0x4f,0xda
    expect_flags 0x8d5, 0
    expect_register r11, 0x76543210

    # 7/8: cmovg ebx,eax false and true.
    mov edi, 7
    movabs rbx, 0xdeadbeef12345678
    mov eax, 0x76543210
    xor ecx, ecx
    .byte 0x0f,0x4f,0xd8
    expect_register rbx, 0x12345678
    mov edi, 8
    movabs rbx, 0xdeadbeef12345678
    mov ecx, 2
    cmp ecx, 1
    .byte 0x0f,0x4f,0xd8
    expect_flags 0x8d5, 0
    expect_register rbx, 0x76543210

    # 9: a false 64-bit cmovle rdx,rax really preserves the whole destination.
    mov edi, 9
    movabs rdx, 0xdeadbeef12345678
    mov eax, 2
    cmp eax, 1
    .byte 0x48,0x0f,0x4e,0xd0
    mov r12, rdx
    expect_register r12, 0xdeadbeef12345678

    # 10: contrast control, NOT a recorded encoding in this archive:
    # legacy register-register MOVSD preserves destination's high lane.
    mov edi, 10
    movdqu xmm1, [rip + old_vector]
    movdqu xmm0, [rip + new_vector]
    .byte 0xf2,0x0f,0x10,0xc8
    movdqu [rip + observed_vector], xmm1
    mov r12, [rip + observed_vector]
    expect_register r12, 0x1111222233334444
    mov r12, [rip + observed_vector + 8]
    expect_register r12, 0xaabbccddeeff0011

    # 11: archived movsd xmm0,QWORD PTR [r13] clears bits 127..64.
    mov edi, 11
    lea r13, [rip + new_vector]
    movdqu xmm0, [rip + old_vector]
    .byte 0xf2,0x41,0x0f,0x10,0x45,0x00
    movdqu [rip + observed_vector], xmm0
    mov r12, [rip + observed_vector]
    expect_register r12, 0x1111222233334444
    mov r12, [rip + observed_vector + 8]
    expect_register r12, 0

    # 12: MOVQ xmm0,rsi clears high XMM lane; original form is 66 REX.W 0F 6E.
    mov edi, 12
    movabs rsi, 0x1111222233334444
    movdqu xmm0, [rip + old_vector]
    .byte 0x66,0x48,0x0f,0x6e,0xc6
    movdqu [rip + observed_vector], xmm0
    mov r12, [rip + observed_vector + 8]
    expect_register r12, 0

    # 13: UCOMISD quiet NaN: unordered flags, clear OF/SF/AF, no invalid bit.
    mov edi, 13
    ldmxcsr [rip + default_mxcsr]
    movsd xmm0, [rip + quiet_nan]
    pxor xmm1, xmm1
    mov al, 0x7f
    add al, 1
    .byte 0x66,0x0f,0x2e,0xc1
    expect_flags 0x8d5, 0x45
    stmxcsr [rip + observed_mxcsr]
    test DWORD PTR [rip + observed_mxcsr], 1
    jne failed_case

    # 14: COMISD quiet NaN with invalid masked: same flags, invalid sticky bit.
    mov edi, 14
    ldmxcsr [rip + default_mxcsr]
    movsd xmm2, [rip + quiet_nan]
    pxor xmm0, xmm0
    .byte 0x66,0x0f,0x2f,0xd0
    expect_flags 0x8d5, 0x45
    stmxcsr [rip + observed_mxcsr]
    test DWORD PTR [rip + observed_mxcsr], 1
    je failed_case

    # 15/16: archived MAXSD xmm3,xmm5 selects the source on signed-zero ties
    # and on a quiet-NaN source. Preserve the destination's high lane.
    mov edi, 15
    ldmxcsr [rip + default_mxcsr]
    movdqu xmm3, [rip + positive_zero_vector]
    movsd xmm5, [rip + negative_zero]
    .byte 0xf2,0x0f,0x5f,0xdd
    movdqu [rip + observed_vector], xmm3
    mov r12, [rip + observed_vector]
    expect_register r12, 0x8000000000000000
    mov r12, [rip + observed_vector + 8]
    expect_register r12, 0xaabbccddeeff0011
    mov edi, 16
    movsd xmm5, [rip + quiet_nan]
    .byte 0xf2,0x0f,0x5f,0xdd
    movq r12, xmm3
    expect_register r12, 0x7ff8000000000123

    # 17: SHL rbp,3: CF is the last shifted-out bit. OF and AF are undefined.
    mov edi, 17
    movabs rbp, 0x2000000000000001
    .byte 0x48,0xc1,0xe5,0x03
    expect_flags 0xc5, 1
    expect_register rbp, 8

    # 18: SAR edi,31: full RDI becomes 0x00000000ffffffff. Case number kept
    # in r15 because EDI itself is the encoded destination.
    mov r15d, 18
    movabs rdi, 0xdeadbeef80000001
    .byte 0xc1,0xff,0x1f
    pushfq
    pop rax
    mov r12, rdi
    mov edi, r15d
    and eax, 0xc5
    cmp eax, 0x84
    jne failed_case
    expect_register r12, 0xffffffff

    # 19: SHR rsi,63 has zero-fill; compare only defined CF/SF/ZF/PF.
    mov edi, 19
    movabs rsi, 0x8000000000000002
    .byte 0x48,0xc1,0xee,0x3f
    expect_flags 0xc5, 0
    expect_register rsi, 1

    # 20: 64-bit three-operand signed IMUL with the archived immediate.
    mov edi, 20
    mov rax, -3
    .byte 0x4c,0x69,0xe0,0xad,0x8b,0xdb,0x68
    expect_flags 0x801, 0
    expect_register r12, -5277655815

    # 21: 32-bit IMUL truncates and zero-extends, but sets CF and OF on overflow.
    mov edi, 21
    mov r12d, 0x10000001
    movabs r8, 0xdeadbeef12345678
    .byte 0x45,0x69,0xc4,0x10,0x27,0x00,0x00
    expect_flags 0x801, 0x801
    expect_register r8, 10000

    # 22: memory-looking NOP must not read the noncanonical operand address.
    mov edi, 22
    movabs rax, 0x0000800000000000
    .byte 0x0f,0x1f,0x84,0x00,0x00,0x00,0x00,0x00

    mov eax, 1                 # Linux write
    mov edi, 1                 # stdout
    lea rsi, [rip + success_message]
    mov edx, success_message_end - success_message
    syscall
    xor edi, edi
failed_case:
    mov eax, 60                # Linux exit, EDI holds failing case or zero
    syscall

.section .rodata
.balign 16
old_vector: .quad 0x9999888877776666, 0xaabbccddeeff0011
new_vector: .quad 0x1111222233334444, 0x5555666677778888
positive_zero_vector: .quad 0, 0xaabbccddeeff0011
negative_zero: .quad 0x8000000000000000
quiet_nan: .quad 0x7ff8000000000123
default_mxcsr: .long 0x1f80
success_message: .ascii "PASS: 22 native x86-64 instruction-state cases\n"
success_message_end:
.section .bss
.balign 16
observed_vector: .skip 16
observed_mxcsr: .skip 4
.section .note.GNU-stack,"",@progbits
