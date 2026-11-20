/**
 * Providers sometimes add their own support contact to an order result
 * (e.g. "Any help (+60 11-3788 9442)"). Customers must not see it, so it is
 * removed before the result is shown. Credentials are left alone: only
 * numbers written in international "+" form, or contact lines, are dropped.
 */

/** A phone number in international form: "+", then at least 8 digits with spaces, dashes or brackets. */
const PHONE = /\+\s*\d(?:[\s\-().]*\d){7,}/g;
/** A run of 8+ digits (spaces/dashes allowed), used only on lines that read like a contact line. */
const DIGITS = /\d(?:[\s\-().]*\d){7,}/;
const CONTACT_WORDS = /\b(any ?help|help|whats ?app|wa\.me|telegram|contact|call|support|viber|imo)\b/i;

export type ResultLine = { label: string | null; value: string };

/** "Username: abc" → label "Username", value "abc". Lines without a short label (or URLs) stay whole. */
export function parseResultLines(text: string): ResultLine[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^([^:\n]{1,40}?)\s*:\s*(.+)$/.exec(line);
      if (!match || match[2].startsWith("//")) return { label: null, value: line };
      return { label: match[1].trim(), value: match[2].trim() };
    });
}

/**
 * The whole delivery as one message to paste to a customer:
 *   ✅<order id>
 *   Username: abc
 *   Password: xyz
 *   <service name>
 */
export function orderShareText(order: { id: string; serviceName: string; result: string }): string {
  const lines = parseResultLines(order.result).map((line) => (line.label === null ? line.value : `${line.label}: ${line.value}`));
  return [`✅${order.id}`, ...lines, order.serviceName.trim()].filter(Boolean).join("\n");
}

export function stripProviderContacts(text: string): string {
  return text
    .split("\n")
    .filter((line) => !(CONTACT_WORDS.test(line) && (DIGITS.test(line) || /wa\.me|t\.me/i.test(line))))
    .map((line) =>
      line
        .replace(PHONE, "")
        .replace(/\(\s*\)|\[\s*\]/g, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
