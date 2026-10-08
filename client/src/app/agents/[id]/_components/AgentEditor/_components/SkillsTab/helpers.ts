/* moveItem is shared with the Context tab; it lives one level up. */
export { moveItem } from "../../helpers";

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
