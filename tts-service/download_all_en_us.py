import os
import urllib.request
import json
import concurrent.futures

VOICES_DIR = os.path.join(os.path.dirname(__file__), "voices")
os.makedirs(VOICES_DIR, exist_ok=True)

VOICES_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/voices.json"
BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/"

def download_file(url, local_path):
    if not os.path.exists(local_path):
        print(f"Downloading {os.path.basename(local_path)}...")
        try:
            urllib.request.urlretrieve(url, local_path)
        except Exception as e:
            print(f"Failed {os.path.basename(local_path)}: {e}")

print("Fetching voices.json...")
req = urllib.request.urlopen(VOICES_URL)
data = json.loads(req.read().decode('utf-8'))

download_tasks = []
for key, info in data.items():
    if key.startswith("en_US-"):
        # info["files"] contains relative paths like "en/en_US/lessac/medium/en_US-lessac-medium.onnx"
        for filepath in info.get("files", {}).keys():
            if filepath.endswith(".onnx") or filepath.endswith(".onnx.json"):
                url = BASE_URL + filepath
                local_path = os.path.join(VOICES_DIR, os.path.basename(filepath))
                download_tasks.append((url, local_path))

print(f"Found {len(download_tasks)} files to download for en_US voices.")
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    for url, path in download_tasks:
        executor.submit(download_file, url, path)

print("All en_US voices synced!")
