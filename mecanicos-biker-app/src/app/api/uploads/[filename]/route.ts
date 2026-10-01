import { NextResponse } from "next/server";
import { readUploadedImage } from "@/lib/uploads";

const CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  // Solo nombres de archivo que nosotros generamos (uuid.ext) — evita path traversal.
  if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const ext = filename.split(".").pop()!.toLowerCase();
  try {
    const data = await readUploadedImage(filename);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPE[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
