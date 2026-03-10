import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

// Webpack in Next.js might mangle the 'ffmpeg-static' path (e.g. \ROOT\node_modules\...)
// We fallback to absolute resolution from process.cwd() just in case.
const isWin = os.platform() === 'win32';
const safeFfmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', isWin ? 'ffmpeg.exe' : 'ffmpeg');
ffmpeg.setFfmpegPath(fs.existsSync(safeFfmpegPath) ? safeFfmpegPath : (ffmpegPath as string));

// In-Memory store for jobs. Good enough for local dev single-user tool.
const jobs = new Map<string, { status: string; progress?: number; resultPath?: string; error?: string }>();

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const color = formData.get('color') as string || '#00FF00';
        const tolerance = formData.get('tolerance') as string || '0.1';
        const spill = formData.get('spill') as string || '0.1';
        const pingPong = formData.get('pingPong') === 'true';
        const bypass = formData.get('bypass') === 'true';

        if (!file) {
            return NextResponse.json({ error: 'No MP4 file provided' }, { status: 400 });
        }

        // Load file buffer (could be memory heavy for huge files, but for short loops it's OK)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const jobId = uuidv4();
        const tmpDir = os.tmpdir();

        // File paths
        const inputPath = path.join(tmpDir, `input_${jobId}.mp4`);
        const outputPath = path.join(tmpDir, `alpha_${jobId}.webm`);

        // Write input temporarily to disk to feed FFmpeg
        fs.writeFileSync(inputPath, buffer);

        jobs.set(jobId, { status: 'processing', progress: 0 });

        // Ensure Hex is formatted, FFmpeg chromakey accepts #RRGGBB
        const colorHex = color.startsWith('#') ? color : `#${color}`;

        const executeChromakey = () => {
            const command = ffmpeg(inputPath);
            const spillSafe = Math.max(0.01, parseFloat(spill));

            if (pingPong) {
                // SINGLE-PASS PING-PONG: Ultra fast, no temp files!
                command.outputOptions([
                    '-c:v libvpx-vp9',          // VP9 codec required for alpha
                    '-pix_fmt yuva420p',        // Format with Alpha channel
                    '-auto-alt-ref 0',          // Critical for VP9 Alpha: prevents dark reference frame ghosting
                    '-an'                       // Strip audio for ping-pong (backward audio sounds weird anyway)
                ]);

                const filterPass1 = bypass
                    ? `[0:v]setpts=PTS-STARTPTS[keyed]`
                    : `[0:v]setpts=PTS-STARTPTS,colorkey=${colorHex}:${tolerance}:${spillSafe}[keyed]`;

                command.complexFilter([
                    filterPass1,
                    `[keyed]split[k1][k2]`,
                    `[k2]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r]`,
                    `[k1][r]concat=n=2:v=1:a=0[outv]`
                ], 'outv');
            } else {
                // STANDARD MODE
                command.outputOptions([
                    '-c:v libvpx-vp9',
                    '-c:a libvorbis',           // WebM audio codec to preserve sound
                    '-pix_fmt yuva420p',
                    '-auto-alt-ref 0',
                    '-shortest'                 // CRITICAL: prevents timeline stretch if audio track is corrupted/longer
                ]);

                if (bypass) {
                    command.videoFilters(`setpts=PTS-STARTPTS`);
                } else {
                    command.videoFilters(`setpts=PTS-STARTPTS,colorkey=${colorHex}:${tolerance}:${spillSafe}`);
                }
            }

            command
                .save(outputPath)
                .on('progress', (progress) => {
                    // For ping-pong, progress can be a bit funky in single-pass filtergraphs, 
                    // but fluent-ffmpeg still tries to estimate.
                    const pct = progress.percent ? Math.max(0, Math.min(100, progress.percent)) : 0;
                    const currentJob = jobs.get(jobId);
                    if (currentJob) {
                        currentJob.progress = pct;
                    }
                })
                .on('end', () => {
                    const currentJob = jobs.get(jobId);
                    if (currentJob) {
                        currentJob.status = 'done';
                        currentJob.resultPath = outputPath;
                        // Cleanup input only
                        try { fs.unlinkSync(inputPath); } catch { }
                    }
                })
                .on('error', (err) => {
                    console.error('FFmpeg engine error:', err);
                    const currentJob = jobs.get(jobId);
                    if (currentJob) {
                        currentJob.status = 'error';
                        currentJob.error = err.message;
                    }
                });
        };

        // Fire the job
        executeChromakey();

        return NextResponse.json({ jobId });

    } catch (error: unknown) {
        console.error('POST Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId || !jobs.has(jobId)) {
        return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 });
    }

    const job = jobs.get(jobId);
    return NextResponse.json(job);
}
