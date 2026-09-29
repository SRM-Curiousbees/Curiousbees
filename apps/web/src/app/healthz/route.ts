// Load balancer / container liveness for the web tier. No auth, no upstream calls.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok', service: 'curiousbees-web' }, { headers: { 'Cache-Control': 'no-store' } });
}
