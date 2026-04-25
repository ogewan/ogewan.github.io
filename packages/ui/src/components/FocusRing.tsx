// Shared class string for composite glass-dark focus rings.
//
// Tokens alone aren't enough — a raw outline-cyan looks anemic against the variable
// celestial backdrop. The design-doc ring is a layered box-shadow: dark pad +
// cyan stroke + cyan bloom (see tokens.html § 10). This helper exports the class
// string so custom interactive elements (e.g. the vertical location rail nodes)
// can opt in without re-deriving the shadow.
//
// Usage:
//   <button className={`... ${focusRingClassName}`}>…</button>
export const focusRingClassName = 'outline-none focus-visible:[box-shadow:var(--focus-ring)]';
