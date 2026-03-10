import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Заглушка: в проде можно хранить в базе данных. Но пока файлик.
const CONFIG_FILE = path.join(process.cwd(), '.idle-animations.json');

export async function GET() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            // Возвращаем пустой массив, если файла еще нет 
            return NextResponse.json([]);
        }

        const fileContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const data = JSON.parse(fileContent);
        return NextResponse.json(data);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(body, null, 2), 'utf-8');
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
