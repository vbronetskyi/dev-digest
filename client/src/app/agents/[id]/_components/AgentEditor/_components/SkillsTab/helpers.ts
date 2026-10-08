/** Move one element; returns a new array. Out-of-range indexes return the input unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/** Linked skills in prompt order. Links to skills missing from the library (deleted mid-flight) are skipped. */
export function orderedLinked<S extends { id: string }>(
  links: readonly { skill_id: string; order: number }[],
  library: readonly S[],
): S[] {
  const byId = new Map(library.map((sk) => [sk.id, sk]));
  return [...links]
    .sort((a, b) => a.order - b.order)
    .map((l) => byId.get(l.skill_id))
    .filter((sk): sk is S => sk !== undefined);
}
