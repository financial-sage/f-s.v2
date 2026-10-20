/**
 * Household context helpers for SinDescuadre.
 *
 * Today a Family is either one adult (individual) or two (couple), detected via
 * member count / partnerId — not a DB enum. Kids / Child roles are deferred
 * (see docs/architecture/implementation/06-authenticated-context.md); extend
 * HouseholdKind later without rewriting callers that use memberCount.
 */

export type HouseholdKind = "individual" | "couple";

/** Future extension point — not used in product yet. */
export type HouseholdRole = "owner" | "adult" | "child" | "guest";

export function getHouseholdKind(memberCount: number): HouseholdKind {
  return memberCount >= 2 ? "couple" : "individual";
}

export function isMultiMember(memberCount: number): boolean {
  return memberCount >= 2;
}

export function isIndividualHousehold(memberCount: number): boolean {
  return !isMultiMember(memberCount);
}

/**
 * Display label for the other adult in a couple household.
 * Returns null for individual households (no partner framing).
 */
export function partnerLabel(
  memberCount: number,
  partnerFirstName?: string | null
): string | null {
  if (!isMultiMember(memberCount)) return null;
  const name = partnerFirstName?.trim().split(/\s+/)[0];
  return name || "Mi pareja";
}

/** Neutral space title for profile / headers. */
export function householdSpaceTitle(memberCount: number): string {
  return isMultiMember(memberCount) ? "Espacio compartido" : "Tu espacio";
}

/** Member count from a classic two-slot family row. */
export function memberCountFromFamilyUsers(
  user1Id?: string | null,
  user2Id?: string | null
): number {
  if (!user1Id) return 0;
  return user2Id ? 2 : 1;
}
