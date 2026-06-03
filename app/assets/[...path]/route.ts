import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPER_ADMIN_ASSET_ORIGIN =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_ASSET_ORIGIN ||
  process.env.SUPER_ADMIN_ASSET_ORIGIN ||
  process.env.INTERNAL_API_BASE_URL;

const PROXY_TIMEOUT_MS = 10_000;

function buildProxyUrl(pathSegments: string[]): string | null {
  if (!SUPER_ADMIN_ASSET_ORIGIN) {
    return null;
  }
  const base = SUPER_ADMIN_ASSET_ORIGIN.replace(/\/$/, '');
  const path = pathSegments
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  // Always proxy through the admin's dynamic asset route, which reads
  // tenant assets from disk on every request. The old behavior of
  // reading from the tenantapp's local filesystem only worked in the
  // monorepo layout and broke the moment admin and tenantapp were
  // deployed to separate paths or servers.
  return `${base}/api/tenant-assets/${path}`;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments = [] } = await context.params;

  if (pathSegments.length === 0) {
    return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
  }

  const proxyUrl = buildProxyUrl(pathSegments);
  if (!proxyUrl) {
    return NextResponse.json(
      {
        error:
          'Tenant assets require NEXT_PUBLIC_SUPER_ADMIN_ASSET_ORIGIN (or INTERNAL_API_BASE_URL) to be set on the tenant runtime.',
      },
      { status: 500 },
    );
  }

  try {
    const upstream = await fetch(proxyUrl, {
      // Server-side fetch from the tenantapp to the admin. No need to
      // forward cookies or auth headers — tenant assets are public.
      cache: 'no-store',
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      const fallback = upstream.status === 404
        ? 'Asset not found.'
        : `Upstream returned ${upstream.status}.`;
      return NextResponse.json({ error: fallback }, { status: upstream.status });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
    const contentLength = upstream.headers.get('content-length');
    const lastModified = upstream.headers.get('last-modified');
    const cacheControl =
      upstream.headers.get('cache-control') ??
      'public, max-age=300, s-maxage=3600';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    };
    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }
    if (lastModified) {
      headers['Last-Modified'] = lastModified;
    }

    return new NextResponse(buffer, { status: upstream.status, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error.';
    return NextResponse.json(
      { error: `Unable to load asset: ${message}` },
      { status: 502 },
    );
  }
}
