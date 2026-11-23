/* This freestanding configuration chooses explicit markers for retired links. */
static inline void list_del(struct list_head *entry)
{
    entry->next->prev = entry->prev;
    entry->prev->next = entry->next;
    entry->next = (struct list_head *)0x100;
    entry->prev = (struct list_head *)0x122;
}
extern void identity_release(void *identity);
#define kfree(identity) identity_release(identity)
