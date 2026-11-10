import { ImageResponse } from "next/og";

// Shown when a UniUnlocker link is shared (Facebook, WhatsApp, Telegram, X) and used by Google Discover.
export const alt = "UniUnlocker – Mobile Software Solution";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 30% 20%, #0b2a5b 0%, #030817 60%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#00e5ff" />
              <stop offset="1" stopColor="#087bff" />
            </linearGradient>
          </defs>
          <path d="M7 5h11v22a6 6 0 0 0 12 0V5h11v22a17 17 0 0 1-34 0z" fill="url(#g)" />
        </svg>
        <div style={{ marginTop: 32, fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>UniUnlocker</div>
        <div style={{ marginTop: 12, fontSize: 40, color: "#00e5ff" }}>Mobile Software Solution</div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#9fb3d1" }}>
          Unlock · FRP · IMEI · Repair · Tool Rental
        </div>
      </div>
    ),
    size,
  );
}
