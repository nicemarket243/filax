import { useCallback, useEffect, useState } from "react";

export type DeviceType = "telephone" | "tablette" | "ordinateur";
export type DeviceStatus = "actif" | "carence" | "sinistre";

export interface Device {
  id: string;
  type: DeviceType;
  name: string; // ex: iPhone 14 Pro
  imei: string;
  status: DeviceStatus;
  registeredAt: number;
  carenceUntil?: number; // fin de la période de carence
}

export type ClaimKind = "perte" | "vol";
export type ClaimStatus = "transmis" | "en_traitement" | "valide" | "refuse";

export interface Claim {
  id: string;
  deviceId: string;
  kind: ClaimKind;
  status: ClaimStatus;
  reference: string;
  createdAt: number;
}

export interface AssuranceData {
  devices: Device[];
  claims: Claim[];
}

const KEY = "filax-assurance-v1";
const DAY = 86_400_000;
const now = Date.now();

function ref(): string {
  return "ASR-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

const SEED: AssuranceData = {
  devices: [
    { id: "d1", type: "telephone", name: "iPhone 14 Pro", imei: "356938035643809", status: "actif", registeredAt: now - 40 * DAY },
    { id: "d2", type: "ordinateur", name: "MacBook Air M2", imei: "C02XL0AHJG5J", status: "carence", registeredAt: now - 3 * DAY, carenceUntil: now + 11 * DAY },
  ],
  claims: [],
};

function load(): AssuranceData {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED;
    return { ...SEED, ...JSON.parse(raw) };
  } catch {
    return SEED;
  }
}

export function useAssuranceStore() {
  const [data, setData] = useState<AssuranceData>(SEED);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(load());
    setReady(true);
  }, []);

  const save = useCallback((updater: (d: AssuranceData) => AssuranceData) => {
    setData((d) => {
      const next = updater(d);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const addDevice = useCallback(
    (type: DeviceType, name: string, imei: string) =>
      save((d) => ({
        ...d,
        devices: [
          {
            id: crypto.randomUUID(),
            type,
            name,
            imei,
            status: "carence",
            registeredAt: Date.now(),
            carenceUntil: Date.now() + 14 * DAY,
          },
          ...d.devices,
        ],
      })),
    [save],
  );

  const addClaim = useCallback(
    (deviceId: string, kind: ClaimKind) =>
      save((d) => ({
        ...d,
        devices: d.devices.map((dev) => (dev.id === deviceId ? { ...dev, status: "sinistre" } : dev)),
        claims: [
          { id: crypto.randomUUID(), deviceId, kind, status: "transmis", reference: ref(), createdAt: Date.now() },
          ...d.claims,
        ],
      })),
    [save],
  );

  return { data, ready, addDevice, addClaim } as const;
}

export const DEVICE_LABEL: Record<DeviceType, string> = {
  telephone: "Téléphone",
  tablette: "Tablette",
  ordinateur: "Ordinateur",
};

export const STATUS_LABEL: Record<DeviceStatus, string> = {
  actif: "Protégé",
  carence: "Période de carence",
  sinistre: "Sinistre en cours",
};

export function carenceRemaining(until?: number): string {
  if (!until) return "";
  const d = Math.max(0, Math.ceil((until - Date.now()) / DAY));
  return `${d} j restants`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
