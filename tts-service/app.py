from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from io import BytesIO
import wave
import numpy as np
import os
import re

from piper import PiperVoice

app = FastAPI()

# Разрешаем CORS, чтобы Next.js (локалхост) мог спокойно дергать этот API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # для локалки пойдет
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VOICES_DIR = os.path.join(os.path.dirname(__file__), "voices")

voices_cache = {}

class TTSRequest(BaseModel):
    text: str
    voice: str = "en_US-lessac-medium.onnx"
    speaker_id: int | None = None
    length_scale: float | None = 1.0
    noise_scale: float | None = 0.667
    noise_w: float | None = 0.8

@app.get("/voices")
def get_voices():
    if not os.path.exists(VOICES_DIR):
        return {"voices": []}
    files = [f for f in os.listdir(VOICES_DIR) if f.endswith(".onnx")]
    return {"voices": files}

def get_voice_model(model_name: str):
    if model_name not in voices_cache:
        path = os.path.join(VOICES_DIR, model_name)
        if not os.path.exists(path):
            raise ValueError(f"Voice model {model_name} not found")
        print(f"Loading Piper voice from {path}...")
        voices_cache[model_name] = PiperVoice.load(path)
        print("Voice model loaded successfully!")
    return voices_cache[model_name]

@app.on_event("startup")
def load_default_voice():
    try:
        get_voice_model("en_US-lessac-medium.onnx")
    except Exception as e:
        print(f"Warning: could not load default voice: {e}")

@app.post("/tts")
def tts(req: TTSRequest):
    try:
        voice = get_voice_model(req.voice)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Предварительно чистим текст от Markdown (*, _, #, ~, скобок) и сторонних символов
    text = re.sub(r'[\*\_~`\#<>\(\)\[\]\{\}]', '', req.text)
    # Удаляем эмодзи и любой мусор: оставляем только буквы, цифры, базу знаков препинания и пробелы
    text = re.sub(r'[^\w\s\.,!\?\-\'\":;]', '', text)
    # Схлопываем лишние пробелы в один
    text = re.sub(r'\s+', ' ', text).strip()

    if not text:
        raise HTTPException(status_code=400, detail="Text is empty")
        
    # Базовая защита от гигантских полотен
    if len(text) > 1000:
        raise HTTPException(status_code=400, detail="Text is too long (max 1000 chars)")

    audio_buffer = BytesIO()

    try:
        with wave.open(audio_buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)  # int16
            wav_file.setframerate(voice.config.sample_rate)

            # Синтез аудио (потоковая генерация от Piper)
            audio_stream = voice.synthesize(text)

            # Пишем чанки в буфер WAV-файла
            for chunk in audio_stream:
                if hasattr(chunk, 'audio_int16_bytes'):
                    wav_file.writeframes(chunk.audio_int16_bytes)
                elif isinstance(chunk, np.ndarray):
                    wav_file.writeframes(chunk.astype(np.int16).tobytes())
                else:
                    wav_file.writeframes(chunk)

        # Перематываем буфер в начало, чтобы StreamingResponse мог его прочитать
        audio_buffer.seek(0)

        return StreamingResponse(
            audio_buffer,
            media_type="audio/wav",
            headers={"Content-Disposition": 'inline; filename="speech.wav"'},
        )
    except Exception as e:
        print(f"TTS Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
