/** Presentation guard only: the database remains authoritative for money and PINs. */
export function transactionFee(amount: number) {
  return Math.max(Math.round((amount * 0.005 + Number.EPSILON) * 100) / 100, 0.1);
}

export function canReviewOutflow(amount: number, balance: number, pin: string, recipient: string) {
  return Number.isFinite(amount) && amount > 0 && amount + transactionFee(amount) <= balance && /^\d{4}$/.test(pin) && recipient.trim().length > 0;
}

export function canValidateDeposit(amount: number, phone: string, minimum: number | null) {
  return Number.isFinite(amount) && amount > 0 && (minimum === null || amount >= minimum) && /^\+?\d{9,15}$/.test(phone.replace(/[\s()-]/g, ""));
}