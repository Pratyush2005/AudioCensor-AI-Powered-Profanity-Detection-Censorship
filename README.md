# 🔇 Chup – Audio Profanity Censoring App

**Chup** is a full-stack Next.js application that censors profane or user-defined custom words in audio files. It uses [AssemblyAI](https://www.assemblyai.com/) to transcribe audio, detects sensitive words, and replaces them with beeps using FFmpeg.

---

## ✨ Features

- 🎧 Upload audio files
- 🧠 Automatic detection of profane words
- 🛠️ Support for custom word censorship
- 🔊 Beep sound overlay using FFmpeg
- 📥 Download censored audio
- 🧹 Files auto-deleted after download

---

## 📦 Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS
- **Backend:** Next.js API Routes
- **Speech-to-Text:** AssemblyAI API
- **Audio Processing:** FFmpeg (via `ffmpeg-static`)
- **Hosting:** Vercel (frontend) + Render/Railway (backend)

---


## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/chup.git
cd chup
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root:
```
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
```

### 4. Run locally
```bash
npm run dev
```
Visit: http://localhost:3000

---

## 📜 License

MIT © 2025 [Pratyush Pradhan](https://github.com/Pratyush2005)