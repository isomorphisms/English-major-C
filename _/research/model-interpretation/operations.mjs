// Deliberately limited to the permitted operation families in the first
// English Major C unknown-entry sum. This is NOT the 72-operation T32 grant.
export const operationSignatures = Object.freeze({
  put_zero_into_register_without_changing_flags: ["destination_register"],
  put_low_sixteen_bits_in_register: ["destination_register"],
  put_high_sixteen_bits_in_register: ["destination_register"],
  compare_register_with_zero_and_update_flags: ["left_register"],
  compare_two_registers_and_update_flags: ["left_register", "right_register"],
  load_four_bytes_from_named_address_into_register: ["address_register", "destination_register"],
  advance_named_address_by_four_without_changing_flags: ["address_register"],
  decrease_named_count_by_one_without_changing_flags: ["count_register"],
  add_named_register_contents_without_changing_flags: ["source_register", "destination_register"],
  replace_execution_index_when_zero_flag_is_one: ["destination_label"],
  replace_execution_index_unconditionally: ["destination_label"],
  copy_register_contents_without_changing_flags: ["source_register", "destination_register"],
  return_to_link_register_instruction_address: []
});

// Structural machine effects are part of the type of the operation, not
// inferred by an embedding score. A new operation must be explicitly granted.
export const operationEffects = Object.freeze({
  put_zero_into_register_without_changing_flags: {flags: "preserve", index: "sequential"},
  put_low_sixteen_bits_in_register: {flags: "preserve", index: "sequential"},
  put_high_sixteen_bits_in_register: {flags: "preserve", index: "sequential"},
  compare_register_with_zero_and_update_flags: {flags: "update", index: "sequential"},
  compare_two_registers_and_update_flags: {flags: "update", index: "sequential"},
  load_four_bytes_from_named_address_into_register: {flags: "preserve", index: "sequential"},
  advance_named_address_by_four_without_changing_flags: {flags: "preserve", index: "sequential"},
  decrease_named_count_by_one_without_changing_flags: {flags: "preserve", index: "sequential"},
  add_named_register_contents_without_changing_flags: {flags: "preserve", index: "sequential"},
  replace_execution_index_when_zero_flag_is_one: {flags: "preserve", index: "conditional_zero_branch"},
  replace_execution_index_unconditionally: {flags: "preserve", index: "unconditional_branch"},
  copy_register_contents_without_changing_flags: {flags: "preserve", index: "sequential"},
  return_to_link_register_instruction_address: {flags: "preserve", index: "return_through_lr"}
});

export const demonstrationContext = Object.freeze({
  architecture: "ARMv7-A T32",
  registers: ["address of the next entry", "number of entries remaining", "running total", "current entry", "unknown marker"],
  labels: ["prepare the total", "check whether any entries remain", "return the result"]
});

export function canonicalCandidate(candidate, context = demonstrationContext) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("A candidate must be a record.");
  }
  const {operation, operands, effects} = candidate;
  if (!Object.hasOwn(operationSignatures, operation)) {
    throw new Error(`Ungrantable operation: ${String(operation)}`);
  }
  const expected = operationSignatures[operation];
  if (!operands || typeof operands !== "object" || Array.isArray(operands) ||
      Object.keys(operands).length !== expected.length ||
      !expected.every(key => Object.hasOwn(operands,key))) {
    throw new Error(`Incorrect operands for ${operation}`);
  }
  for (const key of expected) {
    const val=operands[key];
    const permitted=key.endsWith("_label") ? context.labels : context.registers;
    if (typeof val !== "string" || !permitted.includes(val)) {
      throw new Error(`Undeclared ${key}: ${String(val)}`);
    }
  }
  const requiredEffects=operationEffects[operation];
  if (!effects || effects.flags!==requiredEffects.flags || effects.index!==requiredEffects.index ||
      Object.keys(effects).length !== 2) {
    throw new Error(`Untrue or incomplete machine effects for ${operation}`);
  }
  return JSON.stringify({operation,operands:Object.fromEntries(expected.map(k=>[k,operands[k]])),effects:requiredEffects});
}
