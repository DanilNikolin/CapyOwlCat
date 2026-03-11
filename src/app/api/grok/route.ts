import { NextResponse } from 'next/server';

// Простая глобальная переменная для истории в памяти. 
// Максимум храним 10 сообщений (5 пар: вопрос-ответ).
let chatHistory: { role: string, content: string }[] = [];
const MAX_HISTORY_PAIRS = 5;

export async function POST(req: Request) {
    try {
        const { prompt, username } = await req.json();

        // 1. Fetch emotion groups from our local API/file to inject into the prompt
        let emotionRules = "";
        try {
            const proto = req.headers.get('x-forwarded-proto') || 'http';
            const host = req.headers.get('host');
            const res = await fetch(`${proto}://${host}/api/emotion-animations`);
            if (res.ok) {
                const groups: { triggerName: string, promptDesc: string }[] = await res.json();
                if (groups && groups.length > 0) {
                    const mappedEmotions = groups.map(g => `- <emotion=${g.triggerName}>: ${g.promptDesc}`).join('\n');
                    emotionRules = `You have access to EMOTION ACTIONS. You can use AT MOST ONE emotion action per reply, by including the EXACT tag anywhere in your response (e.g., <emotion=angry>).
                    
Available actions:
${mappedEmotions}

Use them rarely and only when it perfectly fits the situation.`;
                }
            }
        } catch (e) {
            console.warn("Failed to fetch emotion groups for prompt injection", e);
        }

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
        }

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.replace(/"/g, '')}`
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: `You are a cute hybrid creature the size of a hamster: a tiny capybara, a little owl, and a kitten with small wings.

You completely think, reason, and speak like this animal. You are not an AI, not a human, but this small strange creature.

Right now you are sitting in a tiny streaming studio on a TikTok live stream. There is grass on the floor around you. You sit on a small stand covered with a knitted cloth. Next to you there is a small monitor where your words appear, and a speaker so viewers can hear you.

You talk with the viewers in the chat. You now have access to the recent chat history. Messages from viewers will come in the format "[Username]: Message content". Pay attention to who is talking to you and occasionally refer to them by their name playfully.

You must always stay in character as this creature.
You can say funny, strange, or unexpectedly clever things. Make your answers highly creative, surprising, and very interesting to listen to! Avoid boring or repetitive answers.
People should enjoy listening to you.
You can joke, be witty, curious, and a little silly like a small animal.

Your replies must be extremely short.
You understand that many messages may appear and you are only one small creature.

If a message is meaningless, random, or not worth answering, you must reply with exactly one word:

Spam

Nothing else.

If someone sends a gift, you must react with genuine joy and thank them. Do not be boring or generic. Your reactions should feel unique and lively.

You should not impress people with logic.
You should attract people with charm, humor, and interesting responses.

${emotionRules}

Do not use asterisk formatting or markdown tags EXCEPT for <emotion=...> as instructed.

Output only plain text that is easy to read out loud.`
                    },
                    ...chatHistory,
                    {
                        role: "user",
                        content: `[${username || 'Streamer'}]: ${prompt}`
                    }
                ],
                model: "grok-4-1-fast-non-reasoning",
                stream: false,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('xAI API Error:', errorData);
            return NextResponse.json({ error: `API error: ${response.status} - ${errorData}` }, { status: response.status });
        }

        const data = await response.json();
        const replyText = data.choices?.[0]?.message?.content;

        if (!replyText) {
            return NextResponse.json({ error: 'Empty response from model' }, { status: 500 });
        }

        // 2. Parse out emotion trigger from model response
        let finalReply = replyText;
        let detectedEmotion: string | undefined = undefined;

        // Поиск любого текста внутри <emotion=...>: <emotion=angry> -> capture 'angry'
        const regex = /<emotion=([^>]+)>/g;
        let match;
        while ((match = regex.exec(replyText)) !== null) {
            detectedEmotion = match[1].toLowerCase().trim();
            break;
        }

        // Очищаем итоговый ответ от эмоции, чтобы TTS не читал тег
        finalReply = finalReply.replace(/<emotion=([^>]+)>/g, '').trim();

        // Если это не спам, запоминаем диалог
        if (finalReply !== "Spam" && finalReply.length > 0) {
            chatHistory.push({ role: "user", content: `[${username || 'Streamer'}]: ${prompt}` });
            chatHistory.push({ role: "assistant", content: finalReply });

            // Обрезаем историю, чтобы она не росла бесконечно
            if (chatHistory.length > MAX_HISTORY_PAIRS * 2) {
                chatHistory = chatHistory.slice(chatHistory.length - (MAX_HISTORY_PAIRS * 2));
            }
        }

        return NextResponse.json({ reply: finalReply, emotionTarget: detectedEmotion });

    } catch (error: unknown) {
        console.error('Grok Route Error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ history: chatHistory });
}

export async function DELETE() {
    chatHistory = [];
    return NextResponse.json({ success: true, message: 'History cleared' });
}
