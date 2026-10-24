import { Field, Modal, PrimaryButton } from "./ui-kit";
import { formatMoney, type Currency } from "@/lib/filax-store";
import { transactionFee } from "@/lib/transaction-review";

export function TransactionReview({ open, onOpenChange, amount, currency, account, recipient, method, busy, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; amount: number; currency: Currency;
  account: string; recipient: string; method: string; busy?: boolean; onConfirm: () => void;
}) {
  const fee = transactionFee(amount);
  return <Modal open={open} onOpenChange={onOpenChange} title="Récapitulatif final" subtitle="Vérifiez le destinataire et le montant avant de confirmer.">
    <dl className="space-y-3 text-sm text-foreground">
      <Field label="Compte"><dd>{account}</dd></Field>
      <Field label="Destinataire"><dd className="break-words">{recipient}</dd></Field>
      <Field label="Moyen"><dd>{method}</dd></Field>
      <Field label="Montant"><dd>{formatMoney(amount, currency)}</dd></Field>
      <Field label="Frais"><dd>{formatMoney(fee, currency)}</dd></Field>
      <Field label="Total à débiter"><dd className="font-bold">{formatMoney(amount + fee, currency)}</dd></Field>
    </dl>
    <div className="mt-5"><PrimaryButton disabled={busy} onClick={onConfirm}>{busy ? "Traitement…" : "Je confirme les informations"}</PrimaryButton></div>
  </Modal>;
}