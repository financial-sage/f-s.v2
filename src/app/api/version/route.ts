export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
  });
}
