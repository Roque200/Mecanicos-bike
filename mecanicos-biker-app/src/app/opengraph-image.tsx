import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Imagen de vista previa al compartir la liga (WhatsApp, Facebook, etc.).
export const alt = "Mecánicos Bike — Taller especializado en MTB";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(path.join(process.cwd(), "public", "logo-mecanicos-biker.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 96px",
          background: "#0b0b0c",
          color: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={logoSrc} width={300} height={326} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 6, color: "#f9670c" }}>TALLER ESPECIALIZADO EN MTB</div>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05, marginTop: 16 }}>Mecánicos Bike</div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.65)", marginTop: 24, maxWidth: 640 }}>
            Suspensión, frenos, transmisión y mantenimiento. Agenda tu cita en línea.
          </div>
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.45)", marginTop: 28 }}>Apaseo el Grande, Guanajuato</div>
        </div>
      </div>
    ),
    size,
  );
}
