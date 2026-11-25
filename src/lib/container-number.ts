export const CONTAINER_NUMBER_PATTERN = /^[A-Z]{4}[0-9]{7}$/

export function editContainerNumber(value: string, previous: string): string {
  const next = value.replace(/[a-z]/g, letter => letter.toUpperCase()).replace(/[\s-]/g, '')
  if (!/^[A-Z]{0,4}[0-9]{0,7}$/.test(next)) return previous
  if (/^[A-Z]{4}/.test(next) || !/[0-9]/.test(next)) return next
  // Keep the serial number when deleting and repairing letters in the prefix.
  if (/[0-9]/.test(previous) && (next.length < previous.length || /^[A-Z]{0,3}[0-9]/.test(previous))) return next
  return previous
}
