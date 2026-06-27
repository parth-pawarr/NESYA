# FIR NLP Extractor

A rule-based NLP system built with **spaCy** for extracting structured legal entities
from Indian FIR (First Information Report) complaint narratives.

---

## 📁 Folder & File Structure

```
fir_nlp/
│
├── fir_extractor.py            ← Main entry point (CLI + library API)
│
├── extractors/                 ← One module per extraction category
│   ├── __init__.py
│   ├── people.py               ← Victim, accused, witnesses, third parties
│   ├── incident.py             ← Primary action, verbs, violence, weapon, threat
│   ├── property.py             ← Items, type (movable/immovable), financial loss
│   ├── location_time.py        ← Place, location type, date, time, time-of-day
│   └── meta.py                 ← Missing fields detector + confidence scorer
│
├── utils/                      ← Shared utilities
│   ├── __init__.py
│   ├── lexicon.py              ← All keyword/phrase lists (single source of truth)
│   └── preprocessing.py       ← spaCy pipeline builder + regex helpers
│
├── tests/
│   ├── __init__.py
│   ├── sample_narratives.py    ← 3 realistic FIR test cases
│   └── test_extractor.py      ← 23 pytest unit tests (all passing)
│
└── output/                     ← JSON output files (generated at runtime)
```

---

## 🔧 Installation

```bash
pip install spacy
# No pre-trained model needed — uses spacy.blank("en") + rule-based NLP
```

---

## 🚀 Usage

### As a CLI tool

```bash
# From a string
python fir_extractor.py --text "On 15th June 2024, at around 9 PM, I was walking near Laxmi Chowk..."

# From a file
python fir_extractor.py --file complaint.txt

# Write JSON output to file
python fir_extractor.py --file complaint.txt --output output/result.json
```

### As a Python library

```python
from fir_extractor import extract_fir
import json

narrative = """
On 15th June 2024, at around 9 PM, I was walking near Laxmi Chowk, Pune
when a person on a motorcycle snatched my gold chain and fled.
The accused is unknown to me. The chain is worth Rs. 45,000.
A bystander, Ramesh Patil, witnessed the incident.
"""

result = extract_fir(narrative)
print(json.dumps(result, indent=2))
```

---

## 📤 Output Schema

```json
{
  "PEOPLE": {
    "victim":        "complainant name or 'complainant'",
    "accused":       "name, description, or 'unknown person(s)'",
    "witnesses":     ["list of witness names"],
    "third_parties": ["other named persons"]
  },
  "INCIDENT": {
    "primary_action":    "snatching | assault | cheating/fraud | ...",
    "action_verbs":      ["snatched", "fled", ...],
    "violence_involved": true,
    "weapon_used":       "iron rod | knife | null",
    "threat_made":       false
  },
  "PROPERTY": {
    "property_involved": true,
    "property_items":    ["gold", "chain", "mobile"],
    "property_type":     "movable | immovable | both | none",
    "financial_loss":    true,
    "financial_amount":  "Rs. 45,000"
  },
  "LOCATION_AND_TIME": {
    "location":      "Laxmi Chowk",
    "location_type": "public | private | residential | workplace | online | unknown",
    "date":          "15th June 2024",
    "time":          "9 PM",
    "time_of_day":   "morning | afternoon | evening | night | unknown"
  },
  "CONSENT_AND_INTENT": {
    "consent_given":           false,
    "premeditation":           true,
    "accused_known_to_victim": true
  },
  "MISSING_INFORMATION": {
    "missing_fields": ["accused_identity", "motive", "evidence_available"]
  },
  "CONFIDENCE": {
    "extraction_confidence": 0.75,
    "ambiguous_parts": ["approximate time/location phrasing: 'around'"]
  }
}
```

---

## 🧪 Running Tests

```bash
cd fir_nlp/
python -m pytest tests/test_extractor.py -v
# Expected: 23 passed
```

Test scenarios:
- **Chain snatching** — public place, unknown accused, gold chain, Rs. 45,000
- **Domestic violence** — known accused (husband), iron rod weapon, death threat
- **Online fraud** — impersonation, OTP fraud, Rs. 1.5 lakh via UPI, online location

---

## 🏗️ Architecture

```
narrative text
      │
      ▼
 preprocessing.py
  spacy.blank("en") + sentencizer
      │
      ├──► people.py        → regex patterns for names + role heuristics
      ├──► incident.py      → priority-ordered verb→action mapping
      ├──► property.py      → keyword scan + financial regex
      ├──► location_time.py → regex for date/time + keyword location typing
      └──► meta.py          → gap analysis + confidence scoring
                │
                ▼
        fir_extractor.py  ←  assembles final JSON
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| `spacy.blank("en")` instead of `en_core_web_sm` | Pre-trained models aren't tuned for Indian legal text; rule-based matching is more predictable and auditable |
| Priority-ordered action map | More serious crimes (rape > stabbing > assault > theft) listed first so the most legally significant action is reported |
| Word-boundary regex (`\b`) for all keyword matching | Prevents false positives like "screenshot" → "shot", "switched" → "hit" |
| Longer weapon matches first (`sorted(..., key=len, reverse=True)`) | "iron rod" correctly wins over "rod" |
| Confidence score as deduction from 1.0 | Each missing legally-important field subtracts a weighted penalty; capped at 0.30 minimum to avoid over-penalising sparse narratives |

---

## 🔧 Extending the System

**Add new crime verbs** → `utils/lexicon.py` → `CRIME_VERBS` set  
**Add new action category** → `extractors/incident.py` → `ORDERED_ACTION_MAP` list  
**Add new property items** → `utils/lexicon.py` → `MOVABLE_PROPERTY_KEYWORDS` / `IMMOVABLE_PROPERTY_KEYWORDS`  
**Add a new extractor module** → create `extractors/my_extractor.py`, import in `fir_extractor.py`  
**Add missing-field checks** → `extractors/meta.py` → `compute_missing_and_confidence()`
