import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'gifts-animations.json');

// Helper
function ensureDataDir() {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export async function GET() {
    try {
        if (!fs.existsSync(dataFilePath)) {
            return NextResponse.json([]);
        }
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return NextResponse.json(JSON.parse(data));
    } catch {
        return NextResponse.json([]);
    }
}

export async function POST(req: Request) {
    try {
        ensureDataDir();
        const anims = await req.json();
        fs.writeFileSync(dataFilePath, JSON.stringify(anims, null, 2), 'utf8');
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
}
