/** Pure helpers for provider order statuses (no server-only imports, so they can be unit tested). */

export type ProviderOrderState = "pending" | "processing" | "completed" | "rejected";

/**
 * Maps a provider's order status to ours. DHRU panels send a number (0 new,
 * 1 in process, 3 rejected, 4 success); other panels send words, often with
 * extra text ("Completed Successfully", "Order Rejected - Refunded", HTML).
 * Matching whole phrases only used to leave such orders stuck as "pending".
 */
export function parseProviderState(raw: string): ProviderOrderState {
  const value = raw
    .replace(/<[^>]*>/g, " ")
    .trim()
    .toLowerCase();
  if (value === "4") return "completed";
  if (value === "3" || value === "5") return "rejected";
  if (value === "1" || value === "2") return "processing";
  if (/^\d+$/.test(value)) return "pending";
  // Checked before "completed": "Cancelled", "Not completed" and "Failed" must never count as delivered.
  if (/\b(reject|cancel|refund|fail|declin|denied|invalid|error|not found|not (?:completed?|success))/.test(value)) return "rejected";
  if (/\b(success|completed?|done|deliver|finish|ready|replied|answered)/.test(value) && !/\bincomplete/.test(value)) return "completed";
  if (/\b(in ?process|processing|progress|working|accepted|verifying)/.test(value)) return "processing";
  return "pending";
}
