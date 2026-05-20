"use client";
import { useEffect, useState } from "react";
import QR from "qrcode";

export function QRCode({
  text,
  size = 160,
  className = "",
  dark = "#0f0f12",
  light = "#ffffff",
}: {
  text: string;
  size?: number;
  className?: string;
  dark?: string;
  light?: string;
}) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QR.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size * 2,
      color: { dark, light },
    }).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [text, size, dark, light]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={`QR for ${text}`}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
