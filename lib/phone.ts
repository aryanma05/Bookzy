/**
 * Gjør det kunden skriver om til et internasjonalt nummer (+4791234567), eller null hvis det ikke er et nummer.
 * Åtte sifre uten landskode regnes som norsk.
 */
export function toE164(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, '').replace(/^00/, '+');
  const number = /^\d{8}$/.test(compact) ? `+47${compact}` : compact;
  if (!/^\+[1-9]\d{7,14}$/.test(number)) return null;
  // Norske nummer har åtte sifre
  if (number.startsWith('+47') && number.length !== 11) return null;
  return number;
}

/** «+4791234567» → «+47 912 34 567». Andre land vises som de er. */
export function formatPhone(number: string): string {
  const match = /^\+47(\d{3})(\d{2})(\d{3})$/.exec(number);
  return match ? `+47 ${match[1]} ${match[2]} ${match[3]}` : number;
}
