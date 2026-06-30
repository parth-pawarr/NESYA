# NESYA — AI-Powered FIR Chat Assistant

An AI conversational frontend for the NESYA FIR NLP pipeline, allowing users to file First Information Reports (FIRs) through a natural chat interface.

---

## 🏗️ Project Structure

```
NESYA/
├── NLP_Pipeline/          ← Existing NLP extraction pipeline (unchanged)
├── Rule_Engine/           ← Existing BNS Rule Engine (unchanged)
├── Dataset/               ← Training/evaluation data
├── main.py                ← Original CLI entry point
│
├── backend/               ← NEW: FastAPI backend
│   ├── app/
│   │   ├── api/chat.py    ← REST API endpoints
│   │   ├── services/      ← Business logic
│   │   ├── models/        ← Session store
│   │   ├── schemas/       ← Pydantic models
│   │   └── main.py        ← FastAPI app
│   └── requirements.txt
│
└── frontend/              ← NEW: React + TypeScript + Tailwind frontend
    ├── src/
    │   ├── components/    ← UI components
    │   ├── store/         ← Zustand state
    │   ├── services/      ← API client
    │   ├── hooks/         ← Custom React hooks
    │   └── App.tsx        ← Root component
    └── package.json
```

---

## 🚀 Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

> **Note:** `spacy` is already installed if you ran the original NESYA pipeline. No pre-trained model is needed — the pipeline uses `spacy.blank("en")`.

### 2. Start the Backend

```bash
# From the NESYA root directory
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **Swagger Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/api/v1/health

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 4. Start the Frontend

```bash
cd frontend
npm run dev
```

The app will open at **http://localhost:5173**

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/health` | Health check |
| `POST` | `/api/v1/start` | Start a new chat session |
| `POST` | `/api/v1/chat` | Send a message in a session |
| `POST` | `/api/v1/analyze` | Analyze a narrative (stateless) |
| `POST` | `/api/v1/generate-fir` | Force-generate FIR for a session |
| `GET`  | `/api/v1/conversation/{id}` | Get conversation history |
| `GET`  | `/api/v1/conversations` | List all sessions |
| `POST` | `/api/v1/reset` | Delete a session |

### Example Request

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "My bike was stolen near the railway station yesterday at 8 PM"}'
```

### Example Response

```json
{
  "session_id": "uuid-here",
  "status": "collecting",
  "message": "Thank you for sharing. I understand this involves **theft** at **railway station** on ...\n\nTo complete your FIR, I need a few more details:\n\n1. 📍 **Where exactly did it happen?**",
  "missing_fields": ["accused_identity", "witness_details"],
  "completion_percentage": 65,
  "suggested_replies": ["Unknown person", "A stranger on a bike"],
  "conversation": [...]
}
```

---

## 🧠 How the AI Works

1. **User describes incident** → narrative appended to session
2. **NLP pipeline runs** → `extract_fir(full_narrative)` extracts all entities
3. **Rule engine runs** → `BNSRuleEngine().infer(nlp_result)` maps to legal sections
4. **Missing fields detected** → `MISSING_INFORMATION` from NLP + `clarification_questions` from rule engine
5. **Questions asked** → up to 2 prioritized questions per turn
6. **FIR generated** → when all mandatory fields (location + date) are filled

### Mandatory Fields
- `exact_location` — Where did it happen?
- `date_of_incident` — When did it happen?

### Optional Fields (asked if missing)
- `time_of_incident`, `accused_identity`, `witness_details`, `property_value`, `medical_report`, `prior_relationship`, `motive`, `evidence_available`

---

## 🎨 Frontend Features

- **Dark/Light mode** toggle
- **Chat bubbles** with markdown rendering
- **Typing indicator** animation
- **Suggested reply chips** for quick responses
- **FIR progress bar** (0–100%)
- **FIR Document Panel** with:
  - All extracted fields displayed
  - Legal sections with confidence scores
  - Quality flags and recommendations
  - **PDF download** (via jsPDF)
  - **JSON export**
  - **Copy to clipboard**
- **Conversation history** in sidebar
- **Mobile responsive** layout
- **Toast notifications**

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| State | Zustand (with persistence) |
| UI | Lucide React icons, custom components |
| AI/Markdown | react-markdown, remark-gfm |
| PDF | jsPDF |
| Backend | FastAPI, Uvicorn |
| NLP | Existing NESYA pipeline (spaCy) |
| Data | Existing BNS Rule Engine |

---

## 🔧 Environment Variables

Backend (optional `.env` in `backend/`):
```env
# No required env vars — the pipeline works out of the box
PORT=8000
HOST=0.0.0.0
```

Frontend (`.env` in `frontend/`):
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## ⚠️ Important Notes

1. The existing NLP pipeline and BNS Rule Engine are **not modified** in any way.
2. Sessions are stored **in-memory** — they reset when the backend restarts.
3. The system uses **rule-based conversation management** (no LLM required).
4. PDF generation happens entirely client-side using jsPDF.
