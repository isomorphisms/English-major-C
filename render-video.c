#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

enum {
    FRAME_WIDTH = 320,
    FRAME_HEIGHT = 180,
    LEFT_PICTURE_WIDTH = FRAME_WIDTH / 2,
    RIGHT_PICTURE_WIDTH = FRAME_WIDTH - LEFT_PICTURE_WIDTH,
    MARKER_SIZE = 64,
    DEFAULT_FRAME_COUNT = 120
};

typedef struct {
    uint8_t red;
    uint8_t green;
    uint8_t blue;
} Color;

typedef struct {
    uint8_t red;
    uint8_t green;
    uint8_t blue;
    uint8_t opacity;
} PicturePixel;

typedef struct {
    int width;
    int height;
    Color *pixels;
} Frame;

typedef struct {
    int width;
    int height;
    PicturePixel *pixels;
} Picture;

typedef struct {
    size_t capacity;
    uint8_t *bytes;
} ByteBuffer;

static int triangle_wave(int step, int maximum);

static uint8_t byte_bounded_to(int value)
{
    if (value < 0) {
        return 0;
    }
    if (value > 255) {
        return 255;
    }
    return (uint8_t)value;
}

static Color make_color(int red, int green, int blue)
{
    Color result;

    result.red = byte_bounded_to(red);
    result.green = byte_bounded_to(green);
    result.blue = byte_bounded_to(blue);
    return result;
}

static int prepare_frame(Frame *receiving_frame, int width, int height)
{
    size_t pixel_count;
    Color *new_pixels;

    if (receiving_frame == NULL || width <= 0 || height <= 0) {
        return 0;
    }
    if ((size_t)width > SIZE_MAX / (size_t)height) {
        return 0;
    }

    pixel_count = (size_t)width * (size_t)height;
    if (pixel_count > SIZE_MAX / sizeof(*new_pixels)) {
        return 0;
    }

    new_pixels = calloc(pixel_count, sizeof(*new_pixels));
    if (new_pixels == NULL) {
        return 0;
    }

    receiving_frame->width = width;
    receiving_frame->height = height;
    receiving_frame->pixels = new_pixels;
    return 1;
}

static void release_frame(Frame *receiving_frame)
{
    if (receiving_frame == NULL) {
        return;
    }
    free(receiving_frame->pixels);
    receiving_frame->width = 0;
    receiving_frame->height = 0;
    receiving_frame->pixels = NULL;
}

static int prepare_picture(Picture *receiving_picture, int width, int height)
{
    size_t pixel_count;
    PicturePixel *new_pixels;

    if (receiving_picture == NULL || width <= 0 || height <= 0) {
        return 0;
    }
    if ((size_t)width > SIZE_MAX / (size_t)height) {
        return 0;
    }

    pixel_count = (size_t)width * (size_t)height;
    if (pixel_count > SIZE_MAX / sizeof(*new_pixels)) {
        return 0;
    }

    new_pixels = calloc(pixel_count, sizeof(*new_pixels));
    if (new_pixels == NULL) {
        return 0;
    }

    receiving_picture->width = width;
    receiving_picture->height = height;
    receiving_picture->pixels = new_pixels;
    return 1;
}

static void release_picture(Picture *receiving_picture)
{
    if (receiving_picture == NULL) {
        return;
    }
    free(receiving_picture->pixels);
    receiving_picture->width = 0;
    receiving_picture->height = 0;
    receiving_picture->pixels = NULL;
}

static int prepare_byte_buffer(ByteBuffer *receiving_buffer, size_t capacity)
{
    uint8_t *new_bytes;

    if (receiving_buffer == NULL || capacity == 0) {
        return 0;
    }
    new_bytes = malloc(capacity);
    if (new_bytes == NULL) {
        return 0;
    }

    receiving_buffer->capacity = capacity;
    receiving_buffer->bytes = new_bytes;
    return 1;
}

static void release_byte_buffer(ByteBuffer *receiving_buffer)
{
    if (receiving_buffer == NULL) {
        return;
    }
    free(receiving_buffer->bytes);
    receiving_buffer->capacity = 0;
    receiving_buffer->bytes = NULL;
}

static Color *pixel_in_frame(Frame *frame, int column, int row)
{
    return &frame->pixels[(size_t)row * (size_t)frame->width + (size_t)column];
}

static const Color *constant_pixel_in_frame(
    const Frame *frame,
    int column,
    int row
)
{
    return &frame->pixels[(size_t)row * (size_t)frame->width + (size_t)column];
}

static PicturePixel *pixel_in_picture(Picture *picture, int column, int row)
{
    return &picture->pixels[
        (size_t)row * (size_t)picture->width + (size_t)column
    ];
}

static const PicturePixel *constant_pixel_in_picture(
    const Picture *picture,
    int column,
    int row
)
{
    return &picture->pixels[
        (size_t)row * (size_t)picture->width + (size_t)column
    ];
}

static void paint_frame_one_color(Frame *receiving_frame, Color color)
{
    int row;

    for (row = 0; row < receiving_frame->height; ++row) {
        int column;

        for (column = 0; column < receiving_frame->width; ++column) {
            *pixel_in_frame(receiving_frame, column, row) = color;
        }
    }
}

static void paint_left_picture(Picture *receiving_picture, int frame_number)
{
    int row;
    int sun_column;
    int sun_row;

    sun_column = 34 + triangle_wave(frame_number, 70);
    sun_row = 46;

    for (row = 0; row < receiving_picture->height; ++row) {
        int column;

        for (column = 0; column < receiving_picture->width; ++column) {
            PicturePixel *receiving_pixel;
            int red;
            int green;
            int blue;
            int distance_from_sun_squared;
            int horizontal_distance;
            int vertical_distance;

            receiving_pixel = pixel_in_picture(receiving_picture, column, row);
            if (row < receiving_picture->height * 3 / 5) {
                red = 28 + row * 135 / receiving_picture->height;
                green = 40 + row * 72 / receiving_picture->height;
                blue = 105 + row * 90 / receiving_picture->height;
            } else {
                int wave_is_bright;

                wave_is_bright =
                    (column + frame_number * 3 + row * 2) % 31 < 5;
                red = 10 + wave_is_bright * 24;
                green = 38 + wave_is_bright * 52;
                blue = 73 + wave_is_bright * 68;
            }

            horizontal_distance = column - sun_column;
            vertical_distance = row - sun_row;
            distance_from_sun_squared =
                horizontal_distance * horizontal_distance
                + vertical_distance * vertical_distance;
            if (distance_from_sun_squared < 19 * 19) {
                red = 255;
                green = 189 + row / 5;
                blue = 70;
            }

            receiving_pixel->red = byte_bounded_to(red);
            receiving_pixel->green = byte_bounded_to(green);
            receiving_pixel->blue = byte_bounded_to(blue);
            receiving_pixel->opacity = 255;
        }
    }
}

static void paint_right_picture(Picture *receiving_picture, int frame_number)
{
    int row;

    for (row = 0; row < receiving_picture->height; ++row) {
        int column;

        for (column = 0; column < receiving_picture->width; ++column) {
            PicturePixel *receiving_pixel;
            int checker;
            int grid_line;
            int scanning_line;

            receiving_pixel = pixel_in_picture(receiving_picture, column, row);
            checker = ((column + frame_number) / 18 + row / 18) % 2;
            grid_line = column % 18 == 0 || row % 18 == 0;
            scanning_line = (column + frame_number * 2) % receiving_picture->width < 5;

            receiving_pixel->red = byte_bounded_to(
                44 + checker * 38 + grid_line * 54 + scanning_line * 83
            );
            receiving_pixel->green = byte_bounded_to(
                20 + checker * 25 + grid_line * 18 + scanning_line * 31
            );
            receiving_pixel->blue = byte_bounded_to(
                76 + checker * 71 + grid_line * 55 + scanning_line * 46
            );
            receiving_pixel->opacity = 255;
        }
    }
}

static void paint_marker_picture(Picture *receiving_picture, int frame_number)
{
    int row;
    int center_column;
    int center_row;
    int radius;

    center_column = receiving_picture->width / 2;
    center_row = receiving_picture->height / 2;
    radius = receiving_picture->width / 2 - 2;

    for (row = 0; row < receiving_picture->height; ++row) {
        int column;

        for (column = 0; column < receiving_picture->width; ++column) {
            PicturePixel *receiving_pixel;
            int horizontal_distance;
            int vertical_distance;
            int distance_squared;

            receiving_pixel = pixel_in_picture(receiving_picture, column, row);
            horizontal_distance = column - center_column;
            vertical_distance = row - center_row;
            distance_squared =
                horizontal_distance * horizontal_distance
                + vertical_distance * vertical_distance;

            if (distance_squared > radius * radius) {
                receiving_pixel->red = 0;
                receiving_pixel->green = 0;
                receiving_pixel->blue = 0;
                receiving_pixel->opacity = 0;
            } else if (distance_squared > (radius - 3) * (radius - 3)) {
                receiving_pixel->red = 255;
                receiving_pixel->green = 240;
                receiving_pixel->blue = 194;
                receiving_pixel->opacity = 238;
            } else {
                receiving_pixel->red = byte_bounded_to(
                    232 - vertical_distance * 2 + frame_number % 24
                );
                receiving_pixel->green = byte_bounded_to(
                    77 + horizontal_distance * 2
                );
                receiving_pixel->blue = byte_bounded_to(
                    176 - horizontal_distance + vertical_distance
                );
                receiving_pixel->opacity = 168;
            }
        }
    }
}

static uint8_t blend_channel(
    uint8_t foreground,
    uint8_t background,
    uint8_t opacity
)
{
    unsigned int foreground_part;
    unsigned int background_part;

    foreground_part = (unsigned int)foreground * (unsigned int)opacity;
    background_part =
        (unsigned int)background * (unsigned int)(255 - opacity);
    return (uint8_t)((foreground_part + background_part + 127) / 255);
}

static void place_picture_over_frame(
    Frame *receiving_frame,
    const Picture *source_picture,
    int receiving_column,
    int receiving_row
)
{
    int source_row;

    for (source_row = 0; source_row < source_picture->height; ++source_row) {
        int source_column;
        int destination_row;

        destination_row = receiving_row + source_row;
        if (destination_row < 0 || destination_row >= receiving_frame->height) {
            continue;
        }

        for (
            source_column = 0;
            source_column < source_picture->width;
            ++source_column
        ) {
            int destination_column;
            const PicturePixel *source_pixel;
            Color *destination_pixel;

            destination_column = receiving_column + source_column;
            if (
                destination_column < 0
                || destination_column >= receiving_frame->width
            ) {
                continue;
            }

            source_pixel = constant_pixel_in_picture(
                source_picture,
                source_column,
                source_row
            );
            destination_pixel = pixel_in_frame(
                receiving_frame,
                destination_column,
                destination_row
            );
            destination_pixel->red = blend_channel(
                source_pixel->red,
                destination_pixel->red,
                source_pixel->opacity
            );
            destination_pixel->green = blend_channel(
                source_pixel->green,
                destination_pixel->green,
                source_pixel->opacity
            );
            destination_pixel->blue = blend_channel(
                source_pixel->blue,
                destination_pixel->blue,
                source_pixel->opacity
            );
        }
    }
}

static void stitch_pictures_into_frame(
    Frame *receiving_frame,
    const Picture *left_picture,
    const Picture *right_picture
)
{
    place_picture_over_frame(receiving_frame, left_picture, 0, 0);
    place_picture_over_frame(
        receiving_frame,
        right_picture,
        left_picture->width,
        0
    );
}

static int triangle_wave(int step, int maximum)
{
    int period;
    int position;

    if (maximum <= 0) {
        return 0;
    }
    period = maximum * 2;
    position = step % period;
    if (position > maximum) {
        return period - position;
    }
    return position;
}

static int write_frame_as_ppm(
    const Frame *source_frame,
    ByteBuffer *receiving_row_buffer
)
{
    size_t required_capacity;
    int row;

    required_capacity = (size_t)source_frame->width * 3;
    if (receiving_row_buffer->capacity < required_capacity) {
        return 0;
    }
    if (
        fprintf(
            stdout,
            "P6\n%d %d\n255\n",
            source_frame->width,
            source_frame->height
        ) < 0
    ) {
        return 0;
    }

    for (row = 0; row < source_frame->height; ++row) {
        int column;

        for (column = 0; column < source_frame->width; ++column) {
            const Color *source_pixel;
            size_t byte_position;

            source_pixel = constant_pixel_in_frame(source_frame, column, row);
            byte_position = (size_t)column * 3;
            receiving_row_buffer->bytes[byte_position] = source_pixel->red;
            receiving_row_buffer->bytes[byte_position + 1] = source_pixel->green;
            receiving_row_buffer->bytes[byte_position + 2] = source_pixel->blue;
        }

        if (
            fwrite(
                receiving_row_buffer->bytes,
                1,
                required_capacity,
                stdout
            ) != required_capacity
        ) {
            return 0;
        }
    }
    return 1;
}

static int read_frame_count(const char *text, int *receiving_frame_count)
{
    char *first_unread_character;
    long candidate;

    errno = 0;
    first_unread_character = NULL;
    candidate = strtol(text, &first_unread_character, 10);
    if (
        errno != 0
        || first_unread_character == text
        || *first_unread_character != '\0'
        || candidate < 1
        || candidate > 10000
    ) {
        return 0;
    }
    *receiving_frame_count = (int)candidate;
    return 1;
}

int main(int argument_count, char **arguments)
{
    int frame_count;
    int frame_number;
    int exit_status;
    Frame frame = {0, 0, NULL};
    Picture left_picture = {0, 0, NULL};
    Picture right_picture = {0, 0, NULL};
    Picture marker_picture = {0, 0, NULL};
    ByteBuffer output_row = {0, NULL};

    frame_count = DEFAULT_FRAME_COUNT;
    if (argument_count > 2) {
        fprintf(stderr, "usage: %s [frame-count]\n", arguments[0]);
        return 2;
    }
    if (
        argument_count == 2
        && !read_frame_count(arguments[1], &frame_count)
    ) {
        fprintf(stderr, "frame-count must be an integer from 1 through 10000\n");
        return 2;
    }

    if (
        !prepare_frame(&frame, FRAME_WIDTH, FRAME_HEIGHT)
        || !prepare_picture(
            &left_picture,
            LEFT_PICTURE_WIDTH,
            FRAME_HEIGHT
        )
        || !prepare_picture(
            &right_picture,
            RIGHT_PICTURE_WIDTH,
            FRAME_HEIGHT
        )
        || !prepare_picture(&marker_picture, MARKER_SIZE, MARKER_SIZE)
        || !prepare_byte_buffer(&output_row, (size_t)FRAME_WIDTH * 3)
    ) {
        fprintf(stderr, "could not prepare the rendering buffers\n");
        release_byte_buffer(&output_row);
        release_picture(&marker_picture);
        release_picture(&right_picture);
        release_picture(&left_picture);
        release_frame(&frame);
        return 1;
    }

    exit_status = 0;
    for (frame_number = 0; frame_number < frame_count; ++frame_number) {
        int marker_column;
        int marker_row;

        paint_left_picture(&left_picture, frame_number);
        paint_right_picture(&right_picture, frame_number);
        paint_marker_picture(&marker_picture, frame_number);

        paint_frame_one_color(&frame, make_color(7, 9, 17));
        stitch_pictures_into_frame(&frame, &left_picture, &right_picture);

        marker_column = triangle_wave(
            frame_number * 4,
            frame.width + marker_picture.width
        ) - marker_picture.width;
        marker_row = 45 + triangle_wave(frame_number * 3, 42);
        place_picture_over_frame(
            &frame,
            &marker_picture,
            marker_column,
            marker_row
        );

        if (!write_frame_as_ppm(&frame, &output_row)) {
            fprintf(stderr, "could not write frame %d\n", frame_number);
            exit_status = 1;
            break;
        }
    }

    if (fflush(stdout) != 0) {
        fprintf(stderr, "could not finish writing the frame stream\n");
        exit_status = 1;
    }

    release_byte_buffer(&output_row);
    release_picture(&marker_picture);
    release_picture(&right_picture);
    release_picture(&left_picture);
    release_frame(&frame);
    return exit_status;
}
