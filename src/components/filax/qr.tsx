import QRCode from "react-qr-code";

/** QR code FILAX — encode l'ID de réception du membre. */
export function FilaxQR({ value, size = 148, level = "M" }: { value: string; size?: number; level?: "L" | "M" | "Q" | "H" }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <QRCode value={value} size={size} bgColor="#ffffff" fgColor="#05070f" level={level} />
    </div>
  );
}
