import { Meds } from "./Meds.jsx";

// Supplements tab — shares the Meds page logic but filters category
// to "supplement" so vitamins, gummies, powders etc. live in their own
// space separate from prescription meds.
export function Supplements() {
  return (
    <Meds
      category="supplement"
      title="Vitamin · Gummy · Powder"
      kicker="Supplements"
      emptyHint="Click Add Supplement to track melatonin, vitamin D, multivitamins, etc."
    />
  );
}
