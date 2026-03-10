import { NextResponse } from 'next/server';
import { WebcastPushConnection } from 'tiktok-live-connector';

type GlobalState = {
    tiktokConnection?: WebcastPushConnection | null;
    tiktokEventQueue?: Array<{ type: string, data: unknown }>;
};

const globalAny = global as typeof global & GlobalState;

if (!globalAny.tiktokConnection) {
    globalAny.tiktokConnection = null;
    globalAny.tiktokEventQueue = [];
}

export async function POST(req: Request) {
    try {
        const { username } = await req.json();

        if (globalAny.tiktokConnection) {
            globalAny.tiktokConnection.disconnect();
            globalAny.tiktokConnection = null;
        }

        globalAny.tiktokEventQueue = [];

        const liveConnection = new WebcastPushConnection(username, {
            processInitialData: false,
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true
        });

        const state = await liveConnection.connect();

        liveConnection.on('chat', (data: unknown) => {
            // Ограничиваем очередь 50 событиями, чтобы не переполнять память
            if (globalAny.tiktokEventQueue && globalAny.tiktokEventQueue.length > 50) {
                globalAny.tiktokEventQueue.shift();
            }
            globalAny.tiktokEventQueue?.push({ type: 'chat', data });
        });

        liveConnection.on('gift', (data: unknown) => {
            if (globalAny.tiktokEventQueue && globalAny.tiktokEventQueue.length > 50) {
                globalAny.tiktokEventQueue.shift();
            }
            globalAny.tiktokEventQueue?.push({ type: 'gift', data });
        });

        globalAny.tiktokConnection = liveConnection;

        return NextResponse.json({ success: true, roomId: state.roomId });
    } catch (err: unknown) {
        console.error("TikTok Connection Error:", err);
        const errorMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err) || "Unknown Error";
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}

export async function GET() {
    // Возвращаем все новые события и очищаем очередь
    const events = [...(globalAny.tiktokEventQueue || [])];
    globalAny.tiktokEventQueue = [];
    return NextResponse.json({ events, connected: !!globalAny.tiktokConnection });
}

export async function DELETE() {
    if (globalAny.tiktokConnection) {
        globalAny.tiktokConnection.disconnect();
        globalAny.tiktokConnection = null;
    }
    globalAny.tiktokEventQueue = [];
    return NextResponse.json({ success: true, message: 'Disconnected' });
}
