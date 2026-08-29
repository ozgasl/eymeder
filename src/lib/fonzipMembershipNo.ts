// Fonzip's membership_no is a composite key: 4-digit graduation year followed
// by the school number, zero-padded to 4 digits (e.g. year 2026 + school
// number 18 -> 20260018). Confirmed against live Fonzip data for this
// association's account.
export function buildFonzipMembershipNo(graduationYear: number, schoolNumber: string): number | null {
  const yearStr = String(graduationYear);
  const schoolDigits = schoolNumber.replace(/\D/g, "");

  if (yearStr.length !== 4 || schoolDigits.length === 0 || schoolDigits.length > 4) {
    return null;
  }

  const paddedSchoolNumber = schoolDigits.padStart(4, "0");
  return Number(`${yearStr}${paddedSchoolNumber}`);
}
