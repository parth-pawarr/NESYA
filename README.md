# NESYA — AI-Powered FIR Chat Assistant

An AI conversational frontend for the NESYA FIR NLP pipeline, allowing users to file First Information Reports (FIRs) through a natural chat interface.

---

## 🏗️ Project Structure

```
NESYA/
├── NLP_Pipeline/                    ← NLP entity extraction pipeline
│   ├── fir_extractor.py             ← Main extraction orchestrator
│   ├── README.md                    ← NLP documentation
│   ├── extractors/                  ← Specialized extractors
│   │   ├── incident.py              ← Crime/incident type extraction
│   │   ├── location_time.py         ← Location & timestamp extraction
│   │   ├── meta.py                  ← Metadata extraction
│   │   ├── people.py                ← People (accused, witness) extraction
│   │   └── property.py              ← Property/asset extraction
│   ├── tests/                       ← Testing & evaluation
│   │   ├── test_extractor.py        ← Unit tests
│   │   └── sample_narratives.py     ← Test data
│   └── utils/                       ← Utilities
│       ├── lexicon.py               ← Crime/domain lexicons
│       └── preprocessing.py         ← Text preprocessing
│
├── Rule_Engine/                     ← BNS (Bharatiya Nyaya Sanhita) rules mapping
│   └── bns_rule_engine.py           ← Rule inference engine
│
├── Dataset/                         ← Training/evaluation data
│   ├── bns_sections.csv             ← BNS section reference data
│   ├── fir_narrations.csv           ← Sample FIR narratives
│   ├── sample.csv                   ← Dataset sample
│   ├── evaluation_results.csv       ← Model evaluation metrics
│   ├── evaluate_performance.py      ← Evaluation script
│   └── evaluate_performance.ipynb   ← Evaluation notebook
│
├── main.py                          ← Original CLI entry point
│
├── backend/                         ← NEW: FastAPI backend
│   ├── app/
│   │   ├── api/chat.py              ← REST API endpoints
│   │   ├── services/                ← Business logic layer
│   │   ├── models/                  ← Session storage models
│   │   ├── schemas/                 ← Pydantic request/response schemas
│   │   └── main.py                  ← FastAPI app initialization
│   └── requirements.txt             ← Python dependencies
│
└── frontend/                        ← NEW: React + TypeScript + Tailwind
    ├── src/
    │   ├── components/              ← React UI components
    │   │   ├── chat/                ← Chat interface components
    │   │   ├── fir/                 ← FIR document display
    │   │   ├── sidebar/             ← Navigation sidebar
    │   │   └── ui/                  ← Reusable UI elements
    │   ├── store/                   ← Zustand state management
    │   ├── services/                ← API client & utilities
    │   ├── hooks/                   ← Custom React hooks
    │   ├── App.tsx                  ← Root component
    │   └── main.tsx                 ← Entry point
    ├── package.json                 ← Node.js dependencies
    └── vite.config.ts               ← Vite configuration
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

Most `/api/v1/*` endpoints require JWT authentication, except `/api/v1/health`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/health` | Health check |
| `POST` | `/api/v1/start` | Start a chat session |
| `POST` | `/api/v1/chat` | Send a chat message |
| `POST` | `/api/v1/analyze` | Analyze a narrative statelessly |
| `POST` | `/api/v1/generate-fir` | Force-generate FIR for a session |
| `POST` | `/api/v1/reset` | Clear an in-memory session |
| `POST` | `/api/v1/translate` | Translate local-language text |
| `POST` | `/api/v1/conversations` | Create a new conversation |
| `GET`  | `/api/v1/conversations` | List conversations |
| `GET`  | `/api/v1/conversations/{id}` | Get conversation detail |
| `PATCH` | `/api/v1/conversations/{id}` | Rename or archive conversation |
| `DELETE` | `/api/v1/conversations/{id}` | Delete a conversation |
| `POST` | `/api/v1/conversations/search` | Search conversations |
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Authenticate and receive tokens |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token |
| `GET`  | `/api/v1/auth/me` | Get current authenticated user |
| `POST` | `/api/v1/auth/verify-email` | Verify email token |
| `POST` | `/api/v1/auth/forgot-password` | Send password reset email |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token |
| `GET`  | `/api/v1/auth/oauth/{provider}` | Start OAuth sign-in |
| `GET`  | `/api/v1/auth/oauth/{provider}/callback` | OAuth callback redirect |

### Example Request

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
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

Backend (`backend/.env` recommended):

```env
APP_NAME=NESYA FIR Assistant
DEBUG=True
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
DATABASE_URL=postgresql+asyncpg://nesya:password@localhost:5432/nesya_db
SECRET_KEY=change-me-to-a-secure-secret
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=noreply@nesya.ai
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
SKIP_EMAIL_VERIFY=True
```

Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## ⚠️ Important Notes

1. The existing NLP pipeline and BNS Rule Engine are **not modified** in any way.
2. Sessions are stored **in-memory** — they reset when the backend restarts.
3. The system uses **rule-based conversation management** (no LLM required).
4. PDF generation happens entirely client-side using jsPDF.
