// WhatsApp id (international number, digits only) from a phone as typed in the CRM: "+7 701 440 8902", "87020000418", "7014408902".
// Kazakhstan and Russia share +7: a local 8… or a bare 10-digit number becomes 7…. Other countries must be typed with their code.
export function waId(phone: string | null | undefined): string | null {
  const d = (phone || '').replace(/\D/g, '')
  if (d.length === 10) return '7' + d
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) return '7' + d.slice(1)
  return d.length >= 11 && d.length <= 15 ? d : null
}
