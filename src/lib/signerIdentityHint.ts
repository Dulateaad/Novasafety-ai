/** ФИО из displayName без должности (« — слесарь»). */
export function profileNameForSigningCheck(displayName: string): string {
  const dash = displayName.indexOf(' — ')
  return (dash >= 0 ? displayName.slice(0, dash) : displayName).trim()
}
