import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import path from 'path';
import os from 'os';
import fs from 'fs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const name = searchParams.get('name');

    if (!jobId) {
        return new NextResponse('Job ID is missing in request', { status: 400 });
    }

    // Look for the resulting webm file in os.tmpdir
    const outputPath = path.join(os.tmpdir(), `alpha_${jobId}.webm`);

    if (!fs.existsSync(outputPath)) {
        return new NextResponse('Rendered file not found (maybe deleted)', { status: 404 });
    }

    // Next.js handles Node.js readable streams well when wrapped in Web standard ReadableStream
    const fileStream = createReadStream(outputPath);

    const stream = new ReadableStream({
        start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
            fileStream.destroy();
        }
    });

    // URL-encoded name for browsers that support UTF-8 filename*
    const fallbackName = `capyowl_alpha_${jobId.split('-')[0]}.webm`;
    const finalName = name ? `${name}.webm` : fallbackName;
    const encodedName = encodeURIComponent(finalName);

    return new NextResponse(stream as unknown as BodyInit, {
        headers: {
            'Content-Type': 'video/webm',
            // Force download with the target extension
            // Use safe ASCII fallback name for 'filename', but the completely correct URL-encoded string for 'filename*=UTF-8'
            'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
        },
    });
}
