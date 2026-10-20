# Experience: Children (placeholder)

**Status:** out of scope for the current individual-adaptation iteration.

SinDescuadre’s long-term vision includes raising kids and teaching money habits (see product constitution and authenticated-context roles: Owner, Adult, Child, Guest).

## Extension points already in code

- Household detection via member count: `src/lib/household.ts` (`HouseholdKind` today is `individual` | `couple`; kids can extend later without a parallel product model).
- Family remains the aggregate unit; a child would be a **role** inside the family, not a separate app.

## Not decided yet

- Wallets / allowances for children
- Parental controls and visibility
- Onboarding and UX for “familia con hijos”

Do not implement child UX until this experience doc is filled with product decisions.
