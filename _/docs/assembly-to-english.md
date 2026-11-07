# Assembly-to-English decompilation

## Assembly-to-English decompilation target

[What a final English translation of assembly must contain.english](../decompilation/What%20a%20final%20English%20translation%20of%20assembly%20must%20contain.english) defines the bottom-up translation target: begin from actual decoded machine instructions, account for all their machine-visible effects, preserve the original assembly and machine-code evidence, and allow arbitrarily extensive non-executable `(NOTE: ...)` and `(WHY? BECAUSE: ...)` explanations. This does **not** attempt to reproduce the route from R or another high-level language to the executable. The same principles apply to later A32 or x86-64 specimens after their exact machine contracts are supplied. The current 73-operation T32 grant is not enough to claim every possible real disassembly can already be expressed.
