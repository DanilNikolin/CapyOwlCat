import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const getSettingsPath = () => path.join(process.cwd(), 'public', 'assets', 'voice_settings.json');

const defaultSettings = {
    voice: 'en_US-lessac-medium.onnx',
};

export async function GET() {
    const filePath = getSettingsPath();

    if (!fs.existsSync(filePath)) {
        return NextResponse.json(defaultSettings);
    }

    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch {
        return NextResponse.json(defaultSettings);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json(); // Expected: { voice: string }
        const { voice } = body;

        if (!voice) return NextResponse.json({ error: 'Missing voice name' }, { status: 400 });

        const filePath = getSettingsPath();

        let currentData: Record<string, string> = { ...defaultSettings };
        if (fs.existsSync(filePath)) {
            try {
                currentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch { }
        }

        currentData.voice = voice;

        // Ensure directory exists just in case
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));

        return NextResponse.json({ success: true, saved: currentData });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
