#!/bin/sh
set -eu

work_directory=$(mktemp -d)
renderer="$work_directory/render-video"
frame_stream="$work_directory/three-frames.ppm"
first_header="$work_directory/first-header"

clean_up()
{
    rm -f "$renderer" "$frame_stream" "$first_header"
    rmdir "$work_directory"
}
trap clean_up EXIT HUP INT TERM

cc -std=c11 -Wall -Wextra -Werror -pedantic render-video.c -o "$renderer"
"$renderer" 3 > "$frame_stream"

dd if="$frame_stream" of="$first_header" bs=1 count=15 2>/dev/null
printf 'P6\n320 180\n255\n' | cmp -s - "$first_header"

actual_size=$(wc -c < "$frame_stream" | tr -d ' ')
expected_size=518445
if [ "$actual_size" -ne "$expected_size" ]; then
    printf 'expected %s bytes but received %s\n' "$expected_size" "$actual_size" >&2
    exit 1
fi

set -- $(cksum < "$frame_stream")
actual_checksum=$1
expected_checksum=957922153
if [ "$actual_checksum" -ne "$expected_checksum" ]; then
    printf \
        'expected checksum %s but received %s\n' \
        "$expected_checksum" \
        "$actual_checksum" \
        >&2
    exit 1
fi

if command -v ffmpeg >/dev/null 2>&1; then
    ffmpeg \
        -v error \
        -f image2pipe \
        -framerate 30 \
        -i "$frame_stream" \
        -frames:v 3 \
        -f null \
        -
fi

printf 'render-video: three frames compiled, sized, and decoded correctly\n'
