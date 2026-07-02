import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Lock } from "lucide-react";
import { BalanceCard } from "./balance-card";
import { Coffre } from "./coffre";
import {
  type EconomieData,
  type Account,
  formatMoney,
  formatDate,
  isLocked,
  METHOD_LABEL,
} from "./store";

interface AccueilTabProps {
  data: EconomieData;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  onRename: (id: string, name: string) => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  onTransfer: () => void;
  onLock: (acc: Account) => void;
}

export function AccueilTab({
  data,
  activeIndex,
  setActiveIndex,
  onRename,
  onDeposit,
  onWithdraw,
  onTransfer,
  onLock,
}: AccueilTabProps) {
  const accounts = data.accounts;
  const account = accounts[activeIndex] ?? accounts[0];

  const cycle = () => setActiveIndex((activeIndex + 1) % accounts.length);
  const recent = data.transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <BalanceCard account={account} onRename={onRename} onCycle={cycle} index={activeIndex} total={accounts.length} />

      {/* PRIMARY ACTIONS */}
      <div className="grid grid-cols-3 gap-2.5">
        <ActionBtn label="Dépôt" onClick={onDeposit} className="bg-brand-green text-background hover:bg-brand-green/90">
          <ArrowDownToLine className="h-5 w-5" />
        </ActionBtn>
        <ActionBtn label="Retrait" onClick={onWithdraw} className="border border-white/15 bg-white/[0.04] text-foreground hover:bg-white/[0.08]">
          <ArrowUpFromLine className="h-5 w-5" />
        </ActionBtn>
        <ActionBtn label="Transfert" onClick={onTransfer} className="bg-brand-violet text-white hover:bg-brand-violet/90">
          <ArrowLeftRight className="h-5 w-5" />
        </ActionBtn>
      </div>

      {/* COFFRE — MES COMPTES */}
      <Coffre title="Mes comptes" count={accounts.length}>
        <div className="space-y-2">
          {accounts.map((a) => {
            const idx = accounts.indexOf(a);
            const locked = isLocked(a);
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 rounded-2xl p-3 transition-all ${
                  idx === activeIndex ? "bg-brand-green/[0.08]" : "bg-white/[0.03]"
                }`}
              >
                <button onClick={() => setActiveIndex(idx)} className="flex flex-1 items-center gap-3 text-left">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${a.color}/15 text-lg`}>{a.icon}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-foreground">{a.name}</span>
                    <span className="block text-[0.7rem] text-muted-foreground">{a.currency}</span>
                  </span>
                  <span className="text-sm font-bold text-foreground">{formatMoney(a.balance, a.currency)}</span>
                </button>
                <button
                  onClick={() => onLock(a)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    locked ? "bg-brand-violet/20 text-brand-violet" : "bg-white/[0.05] text-muted-foreground hover:text-foreground"
                  }`}
                  title={locked ? "Verrouillé" : "Bloquer les fonds"}
                >
                  <Lock className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </Coffre>

      {/* COFFRE — OBJECTIFS */}
      <Coffre title="Objectifs" count={data.goals.length}>
        <div className="space-y-2.5">
          {data.goals.map((g) => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
            return (
              <div key={g.id} className="rounded-2xl bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="text-lg">{g.icon}</span> {g.name}
                  </span>
                  <span className={`text-[0.72rem] font-bold text-${g.color}`}>{pct}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full bg-${g.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[0.7rem] text-muted-foreground">
                  <span>{formatMoney(g.saved, "USD")}</span>
                  <span>Cible {formatMoney(g.target, "USD")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Coffre>

      {/* COFFRE — ACTIVITÉS RÉCENTES */}
      <Coffre title="Activités récentes" count={data.transactions.length}>
        <div className="space-y-1.5">
          {recent.map((t) => {
            const acc = accounts.find((a) => a.id === t.accountId);
            const dep = t.type === "depot";
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    dep ? "bg-brand-green/15 text-brand-green" : "bg-brand-red/15 text-brand-red"
                  }`}
                >
                  {dep ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                </span>
                <span className="flex-1">
                  <span className="block text-[0.8rem] font-semibold text-foreground">
                    {dep ? "Dépôt" : "Retrait"} · {METHOD_LABEL[t.method]}
                  </span>
                  <span className="block text-[0.66rem] text-muted-foreground">
                    {acc?.name} · {formatDate(t.at)}
                  </span>
                </span>
                <span className={`text-sm font-bold ${dep ? "text-brand-green" : "text-brand-red"}`}>
                  {dep ? "+" : "−"}
                  {formatMoney(t.amount, t.currency)}
                </span>
              </div>
            );
          })}
        </div>
      </Coffre>
    </div>
  );
}

function ActionBtn({
  children,
  label,
  onClick,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 text-[0.72rem] font-bold shadow-lg transition-all active:scale-95 ${className}`}
    >
      {children}
      {label}
    </button>
  );
}
