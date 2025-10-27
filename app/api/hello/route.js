export async function GET() {
  return new Response(JSON.stringify({ ok: true, route: "/api/hello" }), {
    headers: { "content-type": "application/json" },
  });
}
