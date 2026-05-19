# Agentic QA Scenario Generator (AQSG)

Upload a requirements document, get a full test suite in seconds — then refine it with text or voice chat.

---

## What does this app do?

1. **Upload** a requirements document (PDF, Word, Markdown, or CSV).
2. **AI generates** structured test cases automatically, including domain-specific edge cases your team might miss.
3. **Refine** the test suite by chatting with the AI — type or speak your instructions.
4. **Export** the final test suite as a `.csv` file that matches a premade template, ready to import into Jira/Xray or Excel.

---

## Before you start — what you need to install

You only need to do this once.

### 1. Python 3.11

The backend runs on Python. Check if you already have it:

1. Open **Terminal** (on Mac: press `Cmd + Space`, type "Terminal", press Enter)
2. Type this and press Enter:
   ```
   python3 --version
   ```
3. If it says `Python 3.11.x` you're good. If not, download it from:
   👉 https://www.python.org/downloads/release/python-3119/
   - Click the big yellow **"Python 3.11.9"** download button
   - Open the downloaded file and follow the installer

### 2. Node.js (version 18 or higher)

The frontend (the website you see in your browser) needs Node.js.

1. In Terminal, check if you have it:
   ```
   node --version
   ```
2. If it says `v18.x.x` or higher, you're good. If not, download it from:
   👉 https://nodejs.org/en/download
   - Click **"LTS"** (the recommended version)
   - Open the downloaded file and follow the installer

### 3. A Google Gemini API Key (free)

The AI is powered by Google Gemini. You need a free API key.

1. Go to: 👉 https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click **"Create API key"**
4. Copy the key (it looks like: `AIzaSy...`) — you'll use it in a moment

---

## Setting up the project (one time only)

Open **Terminal** and follow these steps in order.

### Step 1 — Navigate to the project folder

```bash
cd ~/Downloads/AQSG
```

> **Tip:** If your project is somewhere else, replace `~/Downloads/AQSG` with the actual path. You can drag the folder into Terminal to get its path automatically.

### Step 2 — Set up the backend

```bash
cd backend
```

Create a virtual environment (an isolated Python workspace):

```bash
python3.11 -m venv venv
```

Activate it:

```bash
source venv/bin/activate
```

You'll see `(venv)` appear at the start of your Terminal line. That means it's working.

Install all the required packages:

```bash
pip install -r requirements.txt
```

> ⏳ This will take 2–5 minutes the first time — it's downloading AI libraries. You'll see a lot of text scrolling by — that's normal.

### Step 3 — Add your API key

In the `backend` folder there is a file called `.env`. Open it in any text editor (TextEdit on Mac works fine):

```bash
open .env
```

You'll see:
```
GOOGLE_API_KEY=your_google_api_key_here
```

Replace `your_google_api_key_here` with the key you copied from Google AI Studio. It should look like:
```
GOOGLE_API_KEY=AIzaSyBm98oXqzS91cS7DekFGl8VNh7Ur3O4YB0
```

Save and close the file.

### Step 4 — Set up the frontend

Open a **second Terminal window** (press `Cmd + T` to open a new tab, or `Cmd + N` for a new window).

Navigate to the frontend folder:

```bash
cd ~/Downloads/AQSG/frontend
```

Install the frontend packages:

```bash
npm install
```

> ⏳ This takes about 1 minute.

---

## Running the app

You need **two Terminal windows open at the same time** — one for the backend, one for the frontend.

### Terminal 1 — Start the backend

```bash
cd ~/Downloads/AQSG/backend
source venv/bin/activate
python -m uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

✅ Leave this window open. Don't close it while using the app.

### Terminal 2 — Start the frontend

```bash
cd ~/Downloads/AQSG/frontend
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
```

✅ Leave this window open too.

### Open the app in your browser

Open any browser (Chrome, Safari, Firefox) and go to:

👉 **http://localhost:5173**

You should see the AQSG upload page.

---

## Using the app

### 1. Upload a document
- Drag your requirements document onto the upload area, or click **"Browse"** to find it
- Supported formats: `.pdf`, `.docx`, `.md`, `.csv`
- After a few seconds, you'll see the workspace with test cases on the right

### 2. View the test cases
- The right panel shows a **spreadsheet table** with your generated test cases
- Click any row to **collapse or expand** its steps
- The **"Explicit"** tab shows cases derived directly from your document
- The **"Domain"** tab shows AI-suggested edge cases based on the industry context

### 3. Refine with chat
- Type in the chat panel on the left to ask for changes:
  - *"Add a test case for when the network is unavailable"*
  - *"Make TC-003 more detailed with 5 steps"*
  - *"Add HIPAA compliance test cases"*
- New or updated test cases appear in the table automatically

### 4. Use voice input
- Click the **microphone button** 🎙️ in the chat panel
- Speak your instruction clearly
- Click the button again to stop recording
- The AI will transcribe your voice and update the test suite

### 5. Download the test suite
- Click **"Download CSV"** in the top-right of the test cases panel
- The file follows a premade template format with 16 columns
- Open it in Excel, or import it directly into Jira/Xray

---

## Stopping the app

When you're done, go to each Terminal window and press **`Ctrl + C`** to stop the server.

---

## Troubleshooting

### "command not found: python3.11"
Your Python installation wasn't added to PATH. Try `python3` instead, or re-run the Python installer and check **"Add Python to PATH"** during installation.

### "ModuleNotFoundError" when starting the backend
The virtual environment isn't active. Make sure you ran `source venv/bin/activate` first — you should see `(venv)` in your terminal prompt.

### The upload gives a 429 error / rate limit
Google's free tier has per-minute limits. Wait 60 seconds and try again. If it keeps happening, the daily limit may be reached — wait until the next day or create a new API key in Google AI Studio.

### The page won't load at localhost:5173
Make sure the frontend Terminal is still running. If you accidentally closed it, re-run `npm run dev` in the `frontend` folder.

### The backend gives a 500 error on chat
This usually means the backend restarted and lost the uploaded document from memory. Simply re-upload your document and it will regenerate.

### "Port already in use" error
Another process is using port 8000 or 5173. Run this to find and stop it:
```bash
# For backend port
lsof -ti:8000 | xargs kill

# For frontend port
lsof -ti:5173 | xargs kill
```
Then restart both servers.

---

## Project structure (for reference)

```
AQSG/
├── backend/
│   ├── main.py                        # API server (FastAPI)
│   ├── requirements.txt               # Python dependencies
│   ├── .env                           # Your API key goes here
│   ├── venv/                          # Python virtual environment (auto-created)
│   └── services/
│       ├── agent.py                   # AI logic (Gemini LLM + RAG chain)
│       └── document_processor.py      # Document loading + embedding
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Main app shell
│   │   ├── api.ts                     # Backend API calls
│   │   ├── types.ts                   # TypeScript data types
│   │   └── components/
│   │       ├── UploadPage.tsx         # Upload screen
│   │       ├── WorkspacePage.tsx      # Split-panel workspace
│   │       ├── ChatPanel.tsx          # Chat + voice interface
│   │       └── TestCasesPanel.tsx     # Spreadsheet table + CSV export
│   └── package.json                   # Node.js dependencies
└── README.md                          # This file
```

---

## AI models used

| Task | Model | Why |
|------|-------|-----|
| Test case generation & chat | `gemini-2.5-flash` | Best free-tier availability |
| Voice transcription | `gemini-2.5-flash` | Native audio understanding |
| Document embeddings | `sentence-transformers/all-MiniLM-L6-v2` | Runs locally — no API quota used |

---

## Quick-start cheat sheet

```bash
# Terminal 1 — Backend
cd ~/Downloads/AQSG/backend
source venv/bin/activate
python -m uvicorn main:app --reload

# Terminal 2 — Frontend
cd ~/Downloads/AQSG/frontend
npm run dev

# Then open: http://localhost:5173
```
