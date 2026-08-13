import QRCode from "react-qr-code";

/** QR code FILAX — encode l'ID de réception du membre. */
export function FilaxQR({ value, size = 148 }: { value: string; size?: number }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <QRCode value={value} size={size} bgColor="#ffffff" fgColor="#05070f" level="M" />
    </div>
  );
}
