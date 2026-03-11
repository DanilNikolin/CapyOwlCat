import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'bgm-settings.json');

function ensureDataDir() {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export async function GET() {
    try {
        if (!fs.existsSync(dataFilePath)) {
            return NextResponse.json({ bgmFile: '', bgmVolume: 0.2 });
        }
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return NextResponse.json(JSON.parse(data));
    } catch {
        return NextResponse.json({ bgmFile: '', bgmVolume: 0.2 });
    }
}

export async function POST(req: Request) {
    try {
        ensureDataDir();
        const config = await req.json();
        fs.writeFileSync(dataFilePath, JSON.stringify(config, null, 2), 'utf8');
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to save bgm settings' }, { status: 500 });
    }
}
