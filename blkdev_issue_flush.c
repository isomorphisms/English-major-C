/* SPDX-License-Identifier: GPL-2.0 */
/*
 * Source excerpt from Linux block/blk-flush.c at
 * 66498c75b4f8017f62d720d9b59675bdf3abce91.
 *
 * This is reference material, not a standalone translation unit.
 */
int blkdev_issue_flush(struct block_device *bdev)
{
	struct bio bio;

	bio_init(&bio, bdev, NULL, 0, REQ_OP_WRITE | REQ_PREFLUSH);
	return submit_bio_wait(&bio);
}
