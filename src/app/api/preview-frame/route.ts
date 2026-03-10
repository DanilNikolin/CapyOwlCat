import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

const isWin = os.platform() === 'win32';
const safeFfmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', isWin ? 'ffmpeg.exe' : 'ffmpeg');
ffmpeg.setFfmpegPath(fs.existsSync(safeFfmpegPath) ? safeFfmpegPath : (ffmpegPath as string));

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const color = formData.get('color') as string || '#00FF00';
        const tolerance = formData.get('tolerance') as string || '0.1';
        const spill = formData.get('spill') as string || '0.1';
        const time = formData.get('time') as string || '0';
        const bypass = formData.get('bypass') === 'true';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const jobId = uuidv4();
        const tmpDir = os.tmpdir();

        const inputPath = path.join(tmpDir, `preview_in_${jobId}.mp4`);
        const outputPath = path.join(tmpDir, `preview_out_${jobId}.png`);

        fs.writeFileSync(inputPath, buffer);
        const colorHex = color.startsWith('#') ? color : `#${color}`;

        const filters = bypass
            ? []
            : [`-vf colorkey=${colorHex}:${tolerance}:${Math.max(0.01, parseFloat(spill))}`];

        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
                .seekInput(parseFloat(time)) // Fast precise seeking
                .frames(1)                   // Extract exactly 1 frame
                .outputOptions([
                    ...filters,
                    '-vcodec png'              // PNG supports Alpha Channel
                ])
                .save(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });

        const pngBuffer = fs.readFileSync(outputPath);

        // Cleanup temporary files silently
        try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch { }

        return new NextResponse(pngBuffer, {
            headers: {
                'Content-Type': 'image/png',
            },
        });

    } catch (error: unknown) {
        console.error('Preview Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
