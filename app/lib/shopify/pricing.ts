export function calculateDeposit(price: number, depositPercent: number) {
  return Math.round(price * (depositPercent / 100) * 100) / 100;
}
