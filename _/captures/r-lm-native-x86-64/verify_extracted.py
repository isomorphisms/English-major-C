#!/usr/bin/env python3
"""Verify extracted R lm native-QR reference files, without rebuilding or running them.

This checks byte identities and the captured checksum ledger. It does not
establish that an R interpreter ran, that the numerical solution is general,
or that the files passed independent ai-ci / Flexible Pipes acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import shutil
import tempfile
from pathlib import Path


# Each digest is independently pinned to the original uncompressed artifact.
EXPECTED_SHA256 = {
    'README.txt': 'dc498e622caaa6945b4ac0d862a265c27b3b24d33d5916c4208f6f50cb4f7aac',
    'call_r_qr': '1253863d4bec543bac03e8b764101e0d8a23d31bbbf7895718c1cac310b6ff18',
    'call_r_qr.c': '9c689fa6887b5fa10f19d544f703805261d51fa698047f7d47f9b5c37d518a36',
    'dqrdc2.f': 'b0e6cb43b58cdd30feb544fc20f3c051c91f0766772916e0b394796bc3a1c795',
    'dqrdc2.o': '1fb57e080594848d8206f1d9ad688002a38deee70b01d9d2169e8df80c11e951',
    'dqrdc2.x86-64.disasm.txt': '1d39427ac5b32ddab7a22a303150cb9c8e29b2fa03df49f81ba88d39be58e0c4',
    'dqrls.f': '139681d815aab76e304252bf15078f72ad62e79444b24ccb71f7cee181e2505b',
    'dqrls.o': '0c215591bb3608af7f946ca50bb8d45ff58daa4fa201fd4bdb3e686705a2d237',
    'dqrls.x86-64.disasm.txt': '968488c7e15ab89373587fa66e65fffc62cdc92bccca2e9d63c40728d69910f2',
    'dqrsl.f': '555c552150439215c186596ea61fd87707e241d093bc1a475e44cc8e6c059ce9',
    'dqrsl.o': '47437af32564e2eae8d160fd491abc923c654015e9579811bbe8956e1763f609',
    'dqrsl.x86-64.disasm.txt': 'ce2660259bd9dd68a76f1e00b9082c6a92d2d04071686ff97543e0386fed25fe',
    'linked-executable.x86-64.disasm.txt': '97bd72262cbef21da2115c435b41eb50685723541d0bb015ff9b20436240ed25',
    'model_example.R': 'e211dd9cfa3fe754aed619db9cd89c82be889f128288a710c493b9a772d1d1c7',
    'sha256sums.txt': 'e22f4e2206a011fd91efce898d5210e8acd79158a930bad3353e9d9388f3596b',
    'test-output.txt': '59be92999dfda6ad21e0bd60386eaab617d38ac84a1c31dd6811484dcc44d4e8',
}

LEDGER_FILES = {
    "call_r_qr", "dqrls.o", "dqrdc2.o", "dqrsl.o",
    "dqrls.x86-64.disasm.txt", "dqrdc2.x86-64.disasm.txt",
    "dqrsl.x86-64.disasm.txt", "linked-executable.x86-64.disasm.txt",
}


class ArtifactMismatch(Exception):
    pass


def require(condition: bool, description: str) -> None:
    if not condition:
        raise ArtifactMismatch(description)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def original_capture_members() -> dict[str, Path]:
    repository = Path(__file__).resolve().parents[3]
    lines = (repository / "_/path-map.tsv").read_text(encoding="utf-8").splitlines()
    require(lines.pop(0) == "old_path\tnew_path", "invalid path-map header")
    rules = [line.split("\t") for line in lines]
    require(all(len(row) == 2 and all(value and not Path(value).is_absolute()
                and ".." not in Path(value).parts for value in row) for row in rules),
            "invalid path-map row")
    require(len({row[0] for row in rules}) == len(rules), "duplicate path-map entry")
    rules.sort(key=lambda row: len(row[0]), reverse=True)
    members = {}
    for name in EXPECTED_SHA256:
        original = "examples/r-lm-native-x86-64/" + name
        rule = next((row for row in rules if original == row[0]
                     or original.startswith(row[0] + "/")), None)
        require(rule is not None, f"missing original capture location: {name}")
        members[name] = repository / (rule[1] + original[len(rule[0]):])
    return members


def verify(directory: Path, members: dict[str, Path] | None = None) -> None:
    require(directory.is_dir(), f"missing directory: {directory}")
    members = members or {name: directory / name for name in EXPECTED_SHA256}

    # The original capture is now kept directly as individual files.
    # Adding a compressed ZIP back is a regression.
    zip_names = sorted(
        path.name for path in directory.iterdir()
        if path.name.lower().endswith(".zip")
    )
    require(not zip_names, f"compressed ZIP is not allowed: {zip_names}")

    # The manifest is independent of the checksum ledger being checked.
    for name, expected_hash in EXPECTED_SHA256.items():
        path = members[name]
        require(path.is_file() and not path.is_symlink(),
                f"missing or non-regular file: {name}")
        require(sha256(path.read_bytes()) == expected_hash,
                f"pinned SHA-256 mismatch: {name}")

    try:
        lines = members["sha256sums.txt"].read_text(
            encoding="ascii"
        ).splitlines()
    except UnicodeDecodeError as error:
        raise ArtifactMismatch("checksum ledger is not ASCII") from error

    parsed: dict[str, str] = {}
    for line in lines:
        parts = line.split("  ", 1)
        require(len(parts) == 2, "malformed checksum ledger line")
        digest, name = parts
        require(len(digest) == 64
                and all(character in "0123456789abcdef" for character in digest),
                "invalid SHA-256 in checksum ledger")
        require(name not in parsed, f"duplicate ledger entry: {name}")
        parsed[name] = digest
    require(set(parsed) == LEDGER_FILES,
            "checksum ledger has unexpected or missing files")
    for name, expected_hash in parsed.items():
        require(expected_hash == EXPECTED_SHA256[name],
                f"ledger disagrees with pinned SHA-256: {name}")


def test_rejection_of_mutations(directory: Path, members: dict[str, Path]) -> None:
    with tempfile.TemporaryDirectory(prefix="r-lm-native-files-") as tmp:
        working = Path(tmp)
        for name in EXPECTED_SHA256:
            shutil.copyfile(members[name], working / name)
        verify(working)

        for name in ("dqrls.x86-64.disasm.txt", "call_r_qr"):
            path = working / name
            original = path.read_bytes()
            require(bool(original), f"cannot mutate empty test file: {name}")
            path.write_bytes(original[:-1] + bytes([original[-1] ^ 1]))
            try:
                verify(working)
            except ArtifactMismatch:
                pass
            else:
                raise ArtifactMismatch(f"modified artifact was accepted: {name}")
            finally:
                path.write_bytes(original)

        missing = working / "model_example.R"
        original = missing.read_bytes()
        missing.unlink()
        try:
            verify(working)
        except ArtifactMismatch:
            pass
        else:
            raise ArtifactMismatch("deleted source file was accepted")
        finally:
            missing.write_bytes(original)

        forbidden = working / "unexpected.zip"
        forbidden.write_bytes(b"ZIPs are not permitted here")
        try:
            verify(working)
        except ArtifactMismatch:
            pass
        else:
            raise ArtifactMismatch("introduced ZIP was accepted")
        finally:
            forbidden.unlink()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true",
                        help="prove corruption, missing files, and ZIPs fail closed")
    options = parser.parse_args()
    try:
        root = Path(__file__).resolve().parent
        members = original_capture_members()
        verify(root, members)
        if options.self_test:
            test_rejection_of_mutations(root, members)
    except (ArtifactMismatch, OSError) as error:
        parser.exit(1, f"FAIL: {error}\n")
    print("PASS: all 16 extracted reference files match pinned SHA-256 digests")
    print("PASS: original checksum ledger agrees with pinned native artifacts")
    print("PASS: no ZIP files present")
    if options.self_test:
        print("PASS: modified text, modified binary, deleted file, and ZIP rejected")
