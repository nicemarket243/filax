export const EXPENSE_CATEGORIES = [
  "Alimentation",
  "Transport",
  "Logement",
  "Énergie & eau",
  "Télécoms & internet",
  "Santé",
  "Éducation",
  "Fournitures & matériel",
  "Restaurants & loisirs",
  "Services professionnels",
  "Taxes & frais",
  "Autre",
] as const;

export type ExpenseRow = {
  vendor: string;
  expense_date: string | null;
  amount: number;
  currency: string;
  category: string;
  doc_type: string;
  description: string | null;
};

const amountFmt = new Intl.NumberFormat("en-US", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Plain decimal with comma (Excel FR), never grouped or in exponent form. */
export function formatAmount(n: number): string {
  return amountFmt.format(n).replace(".", ",");
}

function cell(v: string) {
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV with `;` separator (Excel FR) and UTF-8 BOM so accents open correctly. */
export function expensesToCsv(rows: ExpenseRow[]): string {
  const head = ["Date", "Fournisseur", "Catégorie", "Type", "Montant", "Devise", "Description"];
  const lines = rows.map((r) =>
    [r.expense_date ?? "", r.vendor, r.category, r.doc_type, formatAmount(r.amount), r.currency, r.description ?? ""]
      .map((v) => cell(String(v)))
      .join(";"),
  );
  return "\uFEFF" + [head.join(";"), ...lines].join("\n");
}

export function totalsByCurrency(rows: ExpenseRow[]): Record<string, number> {
  const t: Record<string, number> = {};
  for (const r of rows) t[r.currency] = Math.round(((t[r.currency] ?? 0) + r.amount) * 100) / 100;
  return t;
}
