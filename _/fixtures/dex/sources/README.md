# DEX source packet

`manifest.tsv` distinguishes public specifications from implementation
corroboration and an independent decoder's source table. The full ART list and
smali enum retain their upstream licenses and exact Git blob bytes. ART
implementation excerpts retain the original header and numbered source lines;
explicit omission markers mean they are not standalone compilable files.
Numbered excerpts omit trailing display whitespace; full snapshots retain
their original bytes, including upstream whitespace.
The local SHA-256 in each excerpt row identifies the excerpt, while the
upstream Git blob identifies the full file from which it was selected.

The named ART source was read through `LineageOS/android_art` at the recorded
commit. It is an AOSP-derived fork, not a claim that the entirety of an official
AOSP tag was independently compared or that an ART binary was built or run.
Official AOSP Gitiles access failed in this environment; the public AOSP
documentation remained accessible. This distinction is material to acceptance.

ART material is Apache-2.0; see [the license](LICENSE-Apache-2.0.txt).
The smali enum contains its own BSD copyright, terms and disclaimer.
No source packet file is a newly authored C++ or Java implementation.

`source-facts.tsv` in the parent directory records thirteen concrete source
observations. The checker verifies that those observations remain in the frozen
source packet. That proves preservation, not semantic equivalence of every
English paragraph with an implementation or authoritative specification.
