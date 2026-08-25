/* SPDX-License-Identifier: GPL-2.0-only */
/*
 * Source excerpt from Linux mm/filemap.c at
 * 66498c75b4f8017f62d720d9b59675bdf3abce91.
 *
 * This is reference material, not a standalone translation unit.
 */
int file_write_and_wait_range(struct file *file, loff_t lstart, loff_t lend)
{
	int err = 0, err2;
	struct address_space *mapping = file->f_mapping;

	if (lend < lstart)
		return 0;

	if (mapping_needs_writeback(mapping)) {
		err = filemap_fdatawrite_range(mapping, lstart, lend);
		/* See comment of filemap_write_and_wait() */
		if (err != -EIO)
			__filemap_fdatawait_range(mapping, lstart, lend);
	}
	err2 = file_check_and_advance_wb_err(file);
	if (!err)
		err = err2;
	return err;
}
