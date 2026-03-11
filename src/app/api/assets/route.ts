import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';


const getAssetsDir = () => path.join(process.cwd(), 'public', 'assets');

export async function GET() {
    const dir = getAssetsDir();

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Возвращаем ПРЯМ СПИСОК всех файлов в папке assets
    // Фронт сам решит, что у него есть, а чего нет.
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];

    return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const role = formData.get('role') as string;

        if (!file || !role) {
            return NextResponse.json({ error: 'File or role missing' }, { status: 400 });
        }

        const dir = getAssetsDir();
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        let filename = '';

        // Базовые ассеты
        if (role === 'loopAddon') filename = 'loop_addon.mp4';
        else if (role === 'idle') filename = 'idle.webm';
        else if (role === 'panic') filename = 'panic.webm';
        // Динамические ассеты для групп (должны приходить в формате role="group_{id}_trans_in", etc)
        else if (role.startsWith('group_') || role.startsWith('idlanim_') || role.startsWith('giftanim_') || role.startsWith('emanim_') || role.startsWith('gift_') || role.startsWith('emotion_')) {
            // Разрешаем только webm для слоев кота
            filename = `${role}.webm`;
        }
        else if (role === 'bgm') {
            filename = file.name; // Keep original filename for bgm
        }
        else {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const finalFilePath = path.join(dir, filename);
        fs.writeFileSync(finalFilePath, buffer);

        return NextResponse.json({ success: true, filename });

    } catch (error: unknown) {
        console.error('Asset upload error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'Filename missing' }, { status: 400 });
        }

        // Защита от выхода за пределы директории
        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const dir = getAssetsDir();
        const filePath = path.join(dir, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return NextResponse.json({ success: true, message: 'File deleted' });
        } else {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

    } catch (error: unknown) {
        console.error('Asset delete error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
