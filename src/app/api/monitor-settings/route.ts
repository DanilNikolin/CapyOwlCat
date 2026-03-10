import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'public', 'assets', 'monitor.json');

export async function GET() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            // Default flat matrix values if not exists
            const defaultSettings = {
                width: 640, height: 480,
                borderRadius: 12,
                tlX: 0, tlY: 0,
                trX: 640, trY: 0,
                brX: 640, brY: 480,
                blX: 0, blY: 480,
            };
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultSettings, null, 2));
            return NextResponse.json(defaultSettings);
        }

        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        console.error("Monitor Settings GET Error:", error);
        return NextResponse.json({ error: "Failed to read monitor settings" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Ensure directory exists
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(DB_PATH, JSON.stringify(body, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Monitor Settings POST Error:", error);
        return NextResponse.json({ error: "Failed to save monitor settings" }, { status: 500 });
    }
}
