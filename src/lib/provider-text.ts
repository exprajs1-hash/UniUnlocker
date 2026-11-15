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
