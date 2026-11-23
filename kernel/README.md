# Kernel examples

These are reference examples for **English Major C**, not English Major C
programs. The `eudyptula/` directory preserves the public Eudyptula Challenge
source corpus: all twenty task directories, original assignments, the upstream
kernel build configuration, and licensing information.

- Original project: https://github.com/iomonad/eudyptula
- **Pinned source commit:** `310ecb101d2a64cbaa99b1b4c835cfaaf51e1cee`
- [Original task statements](eudyptula/ASSIGNMENTS)
- [Original license](eudyptula/LICENSE) — public domain / Unlicense
- [English Major C work plan](https://github.com/dilapidated-shed/English-major-C/issues/14)
- [Flexible Pipes job](https://github.com/isomorphisms/flexible-pipes/issues/119)

All imported files retain their original paths below `eudyptula/`; the upstream
content is unmodified. Do not treat participant solutions as correct without
inspection: some contain errors, undefined behavior, or obsolete kernel APIs.
Do not load them on the user's phones or experiment against real disks. For
privileged kernel and filesystem tasks, use a pinned Linux VM and expendable
images.

## Priority for machine-execution studies

- Task 12 — intrusive linked-list layout, pointers, loads/stores, branches.
- Task 06 — device reads/writes and the kernel/userspace memory boundary.
- Task 15 — syscall entry and calling conventions.
- Task 13 — slab allocation and object lifetime.
- Tasks 17–18 — wait queues, kernel threads, mutexes and scheduling.
- Tasks 01, 19, 20 — module lifecycle, networking, FAT ioctl.

English Major C translations, reference disassembly, the execution-index trace,
and independent ai-ci verification must be written and tested separately.
A source copy by itself is not compiler, emulation, or kernel execution evidence.

The [Task 12 lookup](../arm/thumb/identity-find/) now has an English program,
Thumb assembly and an emulated search trace.
