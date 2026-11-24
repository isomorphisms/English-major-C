/* Freestanding definitions for the imported Task 12 creation body. */
#define false 0
extern void *identity_allocate_kernel(unsigned bytes);
extern void identity_created(int id, const char *name);
#define kmalloc(bytes, policy) kmalloc_##policy(bytes)
#define kmalloc_GFP_KERNEL(bytes) identity_allocate_kernel(bytes)
#define pr_info(format, id, name) identity_created(id, name)

static inline void *fill_bytes(void *dst, int value, unsigned count)
{
    unsigned char *cursor = dst;
    while (count--) *cursor++ = (unsigned char)value;
    return dst;
}

static inline char *copy_name(char *dst, const char *src, unsigned count)
{
    unsigned i = 0;
    for (; i < count && src[i]; ++i) dst[i] = src[i];
    for (; i < count; ++i) dst[i] = 0;
    return dst;
}
#define memset fill_bytes
#define strncpy copy_name

static inline void list_add(struct list_head *entry, struct list_head *head)
{
    struct list_head *next = head->next;
    next->prev = entry;
    entry->next = next;
    entry->prev = head;
    head->next = entry;
}
