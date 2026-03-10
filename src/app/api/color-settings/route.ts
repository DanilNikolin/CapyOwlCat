import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const getSettingsPath = () => path.join(process.cwd(), 'public', 'assets', 'color_settings.json');

const defaultSettings = {
    temperature: 0,
    tint: 0,
    hue: 0,
    saturate: 1.0,
    brightness: 1.0,
    contrast: 1.0,
};

export async function GET() {
    const filePath = getSettingsPath();

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({});
    }

    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch {
        return NextResponse.json({});
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const filePath = getSettingsPath();
        let currentData: Record<string, Record<string, number>> = {};

        if (fs.existsSync(filePath)) {
            try {
                currentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch { }
        }

        // Support bulk updates if body is an array: [{slotId, settings}, ...]
        if (Array.isArray(body)) {
            for (const item of body) {
                if (item.slotId && item.settings) {
                    currentData[item.slotId] = { ...defaultSettings, ...item.settings };
                }
            }
        } else {
            // Original single slot update
            if (!body.slotId) return NextResponse.json({ error: 'Missing slotId' }, { status: 400 });
            currentData[body.slotId] = { ...defaultSettings, ...body.settings };
        }

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));

        return NextResponse.json({ success: true, saved: currentData });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
