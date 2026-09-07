import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** Renders `value` as a scannable QR code (SVG, crisp at any size). */
const QrCode: React.FC<QrCodeProps> = ({ value, size = 180, className }) => {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      color: { dark: "#04047a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((out) => {
        if (!cancelled) setSvg(out);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!svg) return <div className={className} style={{ width: size, height: size }} aria-hidden="true" />;

  return (
    <div
      className={className}
      style={{ width: size, height: size, background: "#fff", borderRadius: 8, padding: 6 }}
      role="img"
      aria-label={`QR code linking to ${value}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default QrCode;
