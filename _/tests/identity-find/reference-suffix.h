/* Export the observed fields and head address in the reference ELF. */
const unsigned identity_layout[] = {
    sizeof(struct identity), __builtin_offsetof(struct identity, id),
    __builtin_offsetof(struct identity, lst), sizeof(struct list_head)
};
struct list_head *const reference_head = &identity_list;
