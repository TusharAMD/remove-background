# Background Remover ✂️

> **100% Free & Unlimited AI Background Remover.**  
> Runs entirely on-device (client-side in your browser & native Windows Desktop App). Zero server uploads, completely private.

🔗 **Live Web App**: [https://tusharamd.github.io/remove-background/](https://tusharamd.github.io/remove-background/)  
💾 **Windows App (.exe)**: [Download Setup Installer](https://github.com/TusharAMD/remove-background/releases/download/v1.0.0/Background-Remover-Studio-Setup-1.0.0.exe) \| [Download Portable .exe](https://github.com/TusharAMD/remove-background/releases/download/v1.0.0/Background-Remover-Studio-1.0.0.exe)

---

## ✨ Features

- **🌐 100% In-Browser & Private**: Images are processed directly on your device via WebAssembly/WebGPU. No data leaves your machine.
- **🖥️ Standalone Windows Desktop App**: Powered by native PyTorch BiRefNet for ultra sub-pixel precision with hair, animal fur, lace, and complex portrait details.
- **🎨 Interactive Background Studio**:
  - Transparent Cutout (PNG)
  - Solid Color & Modern Gradients
  - Soft Backdrop Blur & Depth Effect
  - Custom Background Image Upload
  - Backlit Halo & Edge De-bleed Controls
  - Interactive Brush Touch-Up & Manual Refinement
- **⚡ Batch Processing**: Queue multiple images and process them in sequence.
- **📋 One-Click Copy & Export**: Copy transparent cutouts directly to your clipboard or download high-resolution PNGs.

---

## 🚀 Two Powerful AI Modes

| Mode | Technology | Best For | Platform |
| :--- | :--- | :--- | :--- |
| **High Quality** | Dual-AI Continuous Matting | Fine portraits, soft edges & details | Web & Desktop |
| **Fast Mode** | Lightweight WASM Engine | Instant speed & mobile devices | Web & Desktop |
| **Ultra Studio** | Native PyTorch BiRefNet | Sub-pixel hair strands, fur & complex alpha | Windows Desktop (.exe) |

---

## 🛠️ Local Development

### 1. Web Application
```bash
# Clone the repository
git clone https://github.com/TusharAMD/remove-background.git
cd remove-background

# Install dependencies
npm install

# Start local development server
npm run dev
```

### 2. Desktop Electron Application
```bash
# Run desktop app with native AI engine
npm run desktop
```

### 3. Build Windows Executable (.exe)
```bash
npm run dist:win
```

---

## 👤 Author

**Tushar Amdoskar**
- GitHub: [@TusharAMD](https://github.com/TusharAMD)
- LinkedIn: [Tushar Amdoskar](https://www.linkedin.com/in/tushar-amdoskar/)

---

## 📄 License

MIT License. Open source and free for personal & commercial use.
