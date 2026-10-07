/* USD formatting for review cost. A single run routinely costs a fraction of a
   cent, so below $1 we keep three significant digits ($0.0123, $0.0004) rather
   than fixed decimals that would round it to a fake $0.00. Unknown cost reads as
   an em dash — never as zero. */

const BELOW_ONE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumSignificantDigits: 3,
});

const ONE_AND_UP = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const NO_COST = "—";

export function formatCost(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd) || usd < 0) return NO_COST;
  if (usd === 0) return "$0";
  return (usd < 1 ? BELOW_ONE : ONE_AND_UP).format(usd);
}
