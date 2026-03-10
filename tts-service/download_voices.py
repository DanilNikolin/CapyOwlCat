import os
import urllib.request
import concurrent.futures

VOICES_DIR = os.path.join(os.path.dirname(__file__), "voices")
os.makedirs(VOICES_DIR, exist_ok=True)

# List of voices to download (high, medium qualities, different accents)
VOICES = [
    # (name, URL base)
    ("en_US-lessac-medium", "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium"),
    ("en_US-amy-medium", "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium"),
    ("en_GB-alan-medium", "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/medium/en_GB-alan-medium"),
    ("en_US-joe-medium", "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/joe/medium/en_US-joe-medium"),
    ("en_US-libritts-high", "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts/high/en_US-libritts-high"),
]

def download_voice(voice):
    name, base_url = voice
    onnx_file = f"{name}.onnx"
    json_file = f"{name}.onnx.json"
    
    onnx_path = os.path.join(VOICES_DIR, onnx_file)
    json_path = os.path.join(VOICES_DIR, json_file)
    
    if not os.path.exists(onnx_path):
        print(f"Downloading {onnx_file}...")
        try:
            urllib.request.urlretrieve(f"{base_url}.onnx", onnx_path)
            print(f"Downloaded {onnx_file}")
        except Exception as e:
            print(f"Failed to download {onnx_file}: {e}")
            
    if not os.path.exists(json_path):
        print(f"Downloading {json_file}...")
        try:
            urllib.request.urlretrieve(f"{base_url}.onnx.json", json_path)
            print(f"Downloaded {json_file}")
        except Exception as e:
            print(f"Failed to download {json_file}: {e}")

print("Starting background voice downloads...")
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    executor.map(download_voice, VOICES)
print("All voices synced!")
