import os
# Constrain CPU threads on Windows to prevent thread exhaustion during Swin Attention
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import io
import json
import threading
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import sys
import torch

torch.set_num_threads(1)

from torchvision import transforms
from PIL import Image
from transformers import AutoModelForImageSegmentation

print("[BiRefNet Server] Starting background service...")
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[BiRefNet Server] Active Hardware: {device.upper()}")

models = {}
models_lock = threading.Lock()

def get_model(mode="ultra"):
    model_name = "ZhengPeng7/BiRefNet" if mode == "ultra" else "ZhengPeng7/BiRefNet_512x512"
    with models_lock:
        if model_name not in models:
            print(f"[BiRefNet Server] Loading {model_name} on {device} (single-thread mode)...")
            m = AutoModelForImageSegmentation.from_pretrained(model_name, trust_remote_code=True)
            m.to(device, dtype=torch.float32)
            m.eval()
            models[model_name] = m
            print(f"[BiRefNet Server] {model_name} ready.")
        return models[model_name]

# Preload fast model on startup for instant availability
def preload_models():
    try:
        get_model("fast")
    except Exception as e:
        print(f"[BiRefNet Preload Error]: {e}")

threading.Thread(target=preload_models, daemon=True).start()

transforms_map = {
    "ultra": transforms.Compose([
        transforms.Resize((1024, 1024)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ]),
    "fast": transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
}

def process_image(image_bytes: bytes, mode: str = "ultra") -> bytes:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    orig_w, orig_h = image.size
    
    t = transforms_map.get(mode, transforms_map["ultra"])
    model = get_model(mode)
    
    input_tensor = t(image).unsqueeze(0).to(device, dtype=torch.float32)
    with torch.no_grad():
        preds = model(input_tensor)
        if isinstance(preds, (list, tuple)):
            pred_tensor = preds[-1]
        else:
            pred_tensor = preds
        pred = pred_tensor.sigmoid().cpu()[0].squeeze()
        
    pred_pil = transforms.ToPILImage()(pred)
    mask = pred_pil.resize((orig_w, orig_h), Image.Resampling.BILINEAR)
    
    result = image.copy()
    result.putalpha(mask)
    
    buf = io.BytesIO()
    result.save(buf, format="PNG")
    return buf.getvalue()

class BiRefNetHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Engine-Mode")
        self.send_header("Content-Type", content_type)
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(200)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/health", "/"):
            self._set_cors_headers(200, "application/json")
            resp = {
                "status": "ready",
                "engine": "BiRefNet-PyTorch",
                "device": device,
                "modes": ["ultra", "fast"]
            }
            self.wfile.write(json.dumps(resp).encode())
        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Not Found"}).encode())

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        
        mode = "ultra"
        if "mode" in query:
            mode = query["mode"][0].lower()
        if self.headers.get("X-Engine-Mode"):
            mode = self.headers.get("X-Engine-Mode").lower()

        if parsed.path == "/remove-background":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            
            try:
                print(f"[BiRefNet Server] Processing request (size: {len(body)} bytes, mode: {mode.upper()})...")
                out_png = process_image(body, mode=mode)
                print(f"[BiRefNet Server] Cutout ready ({len(out_png)} bytes). Sending to desktop UI.")
                self._set_cors_headers(200, "image/png")
                self.wfile.write(out_png)
            except Exception as e:
                print(f"[BiRefNet Server Error]: {e}", file=sys.stderr)
                self._set_cors_headers(500, "application/json")
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Not Found"}).encode())

    def log_message(self, format, *args):
        sys.stderr.write(f"[BiRefNet Server] {args[0]} {args[1]}\n")

if __name__ == "__main__":
    PORT = 8765
    server = ThreadingHTTPServer(("127.0.0.1", PORT), BiRefNetHandler)
    print(f"[BiRefNet Server] HTTP Server listening on http://127.0.0.1:{PORT}")
    server.serve_forever()
