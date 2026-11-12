/**
 * Moteur de test purement local et sans effet de bord.
 * Aucun import d'authentification, de comptes, de persistance ou de fonctions financières réelles.
 * Tous les montants sont des entiers en centimes pour éviter les erreurs d'arrondi.
 */
export type SandboxCurrency = "USD" | "CDF";
export type SandboxKind = "deposit" | "withdraw" | "reserve";
export type SandboxScenario = "success" | "pending" | "refused" | "cancelled";
export type SandboxStatus = "confirmed" | "pending" | "refused" | "cancelled";

export type SandboxEntry = {
  account: string;
  debit: number;
  credit: number;
};

export type SandboxJournal = {
  operationKey: string;
  kind: string;
  currency: SandboxCurrency;
  entries: readonly SandboxEntry[];
};

export type SandboxResult = {
  status: SandboxStatus;
  operationKey: string;
  duplicate?: boolean;
};

export type SandboxState = {
  currency: SandboxCurrency;
  available: number;
  reserved: number;
  pendingIncoming: number;
  pendingOutgoing: number;
  journals: readonly SandboxJournal[];
  receipts: Readonly<Record<string, { fingerprint: string; result: SandboxResult }>>;
};

export type SandboxRequest = {
  key: string;
  kind: SandboxKind;
  amount: number;
  scenario: SandboxScenario;
};

const cents = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Montant Sandbox invalide");
  return Math.round(amount * 100);
};

const signature = (value: unknown) => JSON.stringify(value);

function journal(operationKey: string, kind: string, currency: SandboxCurrency, entries: SandboxEntry[]): SandboxJournal {
  const debit = entries.reduce((sum, line) => sum + line.debit, 0);
  const credit = entries.reduce((sum, line) => sum + line.credit, 0);
  if (debit !== credit || debit <= 0) throw new Error("Journal Sandbox non équilibré");
  return { operationKey, kind, currency, entries };
}

export function createSandbox(currency: SandboxCurrency = "USD", available = 500): SandboxState {
  return { currency, available: cents(available), reserved: 0, pendingIncoming: 0, pendingOutgoing: 0, journals: [], receipts: {} };
}

export function executeSandbox(state: SandboxState, request: SandboxRequest): { state: SandboxState; result: SandboxResult } {
  if (!/^[A-Za-z0-9:_-]{8,80}$/.test(request.key)) throw new Error("Clé Sandbox invalide");
  const amount = cents(request.amount);
  const fingerprint = signature({ kind: request.kind, amount, scenario: request.scenario });
  const previous = state.receipts[request.key];
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error("Clé Sandbox réutilisée avec d'autres paramètres");
    return { state, result: { ...previous.result, duplicate: true } };
  }

  const result: SandboxResult = {
    operationKey: request.key,
    status: request.scenario === "success" ? "confirmed" : request.scenario === "pending" ? "pending" : request.scenario,
  };
  if (request.scenario === "refused" || request.scenario === "cancelled") {
    return { state: { ...state, receipts: { ...state.receipts, [request.key]: { fingerprint, result } } }, result };
  }
  if (request.kind !== "deposit" && amount > state.available) {
    const refused: SandboxResult = { operationKey: request.key, status: "refused" };
    return { state: { ...state, receipts: { ...state.receipts, [request.key]: { fingerprint, result: refused } } }, result: refused };
  }

  let available = state.available;
  let reserved = state.reserved;
  let pendingIncoming = state.pendingIncoming;
  let pendingOutgoing = state.pendingOutgoing;
  const journals = [...state.journals];
  const account = `sandbox:${state.currency}`;

  if (request.scenario === "pending") {
    if (request.kind === "deposit") pendingIncoming += amount;
    else {
      available -= amount;
      pendingOutgoing += amount;
      journals.push(journal(request.key, `${request.kind}_hold`, state.currency, [
        { account: `${account}:available`, debit: amount, credit: 0 },
        { account: `${account}:pending`, debit: 0, credit: amount },
      ]));
    }
  } else if (request.kind === "deposit") {
    available += amount;
    journals.push(journal(request.key, request.kind, state.currency, [
      { account: "sandbox:clearing", debit: amount, credit: 0 },
      { account: `${account}:available`, debit: 0, credit: amount },
    ]));
  } else if (request.kind === "withdraw") {
    available -= amount;
    journals.push(journal(request.key, request.kind, state.currency, [
      { account: `${account}:available`, debit: amount, credit: 0 },
      { account: "sandbox:external", debit: 0, credit: amount },
    ]));
  } else {
    available -= amount;
    reserved += amount;
    journals.push(journal(request.key, request.kind, state.currency, [
      { account: `${account}:available`, debit: amount, credit: 0 },
      { account: `${account}:reserved`, debit: 0, credit: amount },
    ]));
  }

  return {
    state: { ...state, available, reserved, pendingIncoming, pendingOutgoing, journals, receipts: { ...state.receipts, [request.key]: { fingerprint, result } } },
    result,
  };
}

export function settleSandbox(state: SandboxState, operationKey: string, outcome: "success" | "cancelled"): SandboxState {
  const original = state.receipts[operationKey];
  if (!original || original.result.status !== "pending") throw new Error("Opération Sandbox non en attente");
  const settlementKey = `${operationKey}:settlement`;
  if (state.receipts[settlementKey]) return state;

  const fingerprint = signature({ operationKey, outcome });
  const isDeposit = original.fingerprint.includes('"kind":"deposit"');
  const isReserve = original.fingerprint.includes('"kind":"reserve"');
  const amountMatch = /"amount":(\d+)/.exec(original.fingerprint);
  if (!amountMatch) throw new Error("Montant Sandbox introuvable");
  const amount = Number(amountMatch[1]);
  let available = state.available;
  let reserved = state.reserved;
  let pendingIncoming = state.pendingIncoming;
  let pendingOutgoing = state.pendingOutgoing;
  const journals = [...state.journals];
  const account = `sandbox:${state.currency}`;

  if (isDeposit) {
    pendingIncoming -= amount;
    if (outcome === "success") {
      available += amount;
      journals.push(journal(settlementKey, "deposit", state.currency, [
        { account: "sandbox:clearing", debit: amount, credit: 0 },
        { account: `${account}:available`, debit: 0, credit: amount },
      ]));
    }
  } else {
    pendingOutgoing -= amount;
    if (outcome === "cancelled") available += amount;
    if (outcome === "success" && isReserve) reserved += amount;
    journals.push(journal(settlementKey, outcome === "success" ? (isReserve ? "reserve" : "withdraw") : "release", state.currency, outcome === "success" ? [
      { account: `${account}:pending`, debit: amount, credit: 0 },
      { account: isReserve ? `${account}:reserved` : "sandbox:external", debit: 0, credit: amount },
    ] : [
      { account: `${account}:pending`, debit: amount, credit: 0 },
      { account: `${account}:available`, debit: 0, credit: amount },
    ]));
  }

  const result: SandboxResult = { operationKey: settlementKey, status: outcome === "success" ? "confirmed" : "cancelled" };
  return { ...state, available, reserved, pendingIncoming, pendingOutgoing, journals, receipts: { ...state.receipts, [settlementKey]: { fingerprint, result } } };
}

export function assertSandboxIntegrity(state: SandboxState) {
  if ([state.available, state.reserved, state.pendingIncoming, state.pendingOutgoing].some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("Solde Sandbox invalide");
  }
  for (const item of state.journals) {
    const debit = item.entries.reduce((sum, line) => sum + line.debit, 0);
    const credit = item.entries.reduce((sum, line) => sum + line.credit, 0);
    if (debit !== credit || debit <= 0) throw new Error("Journal Sandbox non équilibré");
  }
  return true;
}
