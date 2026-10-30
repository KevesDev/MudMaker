/**
 * The width of the end region of a split after a resize is asked for. Neither region may be narrower than
 * `min`; when the container is too narrow for both, the end region keeps `min`. An unmeasured container
 * (total of zero or less) only enforces the lower bound.
 */
export function clampEndSize(total: number, requested: number, min: number, divider: number): number {
  const lowest = Math.max(requested, min);
  if (total <= 0) return lowest;
  const highest = Math.max(min, total - divider - min);
  return Math.min(lowest, highest);
}
