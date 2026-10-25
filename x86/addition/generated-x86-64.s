# First x86-64 implementation of the same bounded unknown-entry-sum contract.
# System V AMD64 arguments: RDI=word pointer, ESI=count, EAX=result.
# 32-bit words; all-ones sentinel means unknown; result wraps modulo 2^32.
.intel_syntax noprefix
.text
.globl add_all_known_entries_x86_64
.type add_all_known_entries_x86_64, @function
add_all_known_entries_x86_64:
english_instruction_prepare_the_total:
    # English line 10: Name the following instruction "prepare the total".
    mov edx, 0
    # English line 11: Put zero into "running total" without changing the condition flags.
    mov r8d, 65535
    # English line 12: Put 65535 into the low sixteen bits of "unknown marker" and zero into its high sixteen bits.
    or r8d, 0xffff0000
    # English line 13: Set the high sixteen bits of "unknown marker" to one by a bitwise inclusive OR and update the condition flags.
english_instruction_check_whether_any_entries_remain:
    # English line 15: Name the following instruction "check whether any entries remain".
    cmp esi, 0
    # English line 16: Compare "number of entries remaining" with zero and update the condition flags.
    je english_instruction_return_the_result
    # English line 17: If the zero flag is one, replace the execution index with the instruction named "return the result".
    mov ecx, DWORD PTR [rdi]
    # English line 18: Load exactly four bytes from the address in "address of the next entry" into "current entry".
    lea rdi, [rdi + 4]
    # English line 19: Increase "address of the next entry" by four without changing the condition flags.
    lea esi, [rsi - 1]
    # English line 20: Decrease "number of entries remaining" by one without changing the condition flags.
    cmp ecx, r8d
    # English line 21: Compare "current entry" with "unknown marker" and update the condition flags.
    je english_instruction_check_whether_any_entries_remain
    # English line 22: If the zero flag is one, replace the execution index with the instruction named "check whether any entries remain".
    lea edx, [rdx + rcx]
    # English line 23: Add "current entry" to "running total" and keep only the lowest thirty-two result bits without changing the condition flags.
    jmp english_instruction_check_whether_any_entries_remain
    # English line 24: Replace the execution index with the instruction named "check whether any entries remain".
english_instruction_return_the_result:
    # English line 26: Name the following instruction "return the result".
    mov eax, edx
    # English line 27: Copy "running total" into "return value" without changing the condition flags.
    ret
    # English line 28: Return to the address saved by the machine call operation.
.size add_all_known_entries_x86_64, .-add_all_known_entries_x86_64
