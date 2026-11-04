import { readUpload } from "@/lib/uploads";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = await readUpload(name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // A PDF is stored as the creator sent it, so it downloads rather than opening on our origin.
      ...(file.type === "application/pdf" && { "Content-Disposition": "attachment", "Content-Security-Policy": "sandbox" }),
    },
  });
}
