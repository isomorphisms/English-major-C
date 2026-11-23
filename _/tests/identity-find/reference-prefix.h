/* Freestanding specimen of the list operations used by the imported find function.
   The loop tests the sentinel before forming a containing-object pointer. */
typedef _Bool bool;
#define NULL ((void *)0)
struct list_head { struct list_head *next, *prev; };
#define LIST_HEAD(name) struct list_head name = { &name, &name }
#define list_for_each_entry(pos, head, member) \
    for (struct list_head *cursor = (head)->next; \
         cursor != (head) && ((pos) = (void *)((char *)cursor - \
                   __builtin_offsetof(__typeof__(*(pos)), member)), 1); \
         cursor = cursor->next)
