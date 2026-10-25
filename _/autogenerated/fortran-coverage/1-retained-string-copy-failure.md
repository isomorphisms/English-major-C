# First generator attempt: excess retained annotation copies

The first source-only run exited 134 after Node reached its 2 GiB heap limit.
It produced no accepted inventory. The failed implementation is preserved in
audit-v1-retained-copy-bug.mjs.

The annotation loop decoded the complete UTF-8 buffer separately for every row.
Retained effect substrings could keep each full decoded copy alive. The repair
decodes each annotation artifact once and slices the same text for all its rows.
This changes memory ownership, not original evidence or coverage requirements.
The next run must still perform the full byte/annotation accounting.
