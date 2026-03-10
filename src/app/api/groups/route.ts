import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const getGroupsPath = () => path.join(process.cwd(), 'public', 'assets', 'groups.json');

// Дефолтная первая группа, если конфиг пуст
const defaultGroups = [
    {
        id: 'group_default',
        triggerTime: 5.0,
        transIn: 'group_default_trans_in.webm',
        talk: 'group_default_talk.webm',
        transOut: 'group_default_trans_out.webm'
    }
];

export async function GET() {
    const filePath = getGroupsPath();

    if (!fs.existsSync(filePath)) {
        return NextResponse.json(defaultGroups);
    }

    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch {
        return NextResponse.json(defaultGroups);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json(); // Ожидаем массив групп

        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Expected an array of groups' }, { status: 400 });
        }

        const filePath = getGroupsPath();
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(filePath, JSON.stringify(body, null, 2));

        return NextResponse.json({ success: true, saved: body });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
