import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ASSET_ROOT = path.resolve(
  process.cwd(),
  '..',
  'remedygcc-admin',
  'public',
  'assets',
);

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function resolveAssetPath(pathSegments: string[]): string {
  const resolvedPath = path.resolve(ASSET_ROOT, ...pathSegments);

  if (!resolvedPath.startsWith(ASSET_ROOT)) {
    throw new Error('Invalid asset path.');
  }

  return resolvedPath;
}

async function serveAsset(pathSegments: string[]) {
  const assetPath = resolveAssetPath(pathSegments);
  const fileBuffer = await fs.readFile(assetPath);
  const extension = path.extname(assetPath).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? 'application/octet-stream';

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments = [] } = await context.params;
    return await serveAsset(pathSegments);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Unable to load asset.' }, { status: 400 });
  }
}
