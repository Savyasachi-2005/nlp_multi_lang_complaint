# Multilingual NLP-Based Complaint Processing and Local Language Generation System

## Overview

This project accepts a citizen complaint in free-form text, analyzes it using a local NLP pipeline, and generates a formal complaint letter in a selected target language.

The system uses local, syllabus-aligned NLP modules for preprocessing, feature engineering, classification, extraction, and formatting. Sarvam AI is used for translation.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | FastAPI (Python) |
| Frontend | React (Vite + TypeScript) |
| Styling | Tailwind CSS |
| External API | Sarvam AI (translation) |

## Features

- Multilingual complaint input
- Automatic input-language detection
- Translation to English pivot language
- NLP preprocessing (normalization, tokenization, stopword removal, lemmatization)
- Feature engineering (BoW + TF-IDF)
- Hybrid classification (Logistic Regression + rule fallback)
- POS-based linguistic cues for extraction
- Bigram language-model enhancement with add-one smoothing
- WordNet-based semantic expansion and fallback support
- Structured formal complaint generation
- Output translation to selected language
- PDF export of complaint output

## Supported Output Languages

- Hindi (`hi`)
- Kannada (`kn`)
- Tamil (`ta`)
- Telugu (`te`)
- Marathi (`mr`)

## Project Structure

```text
project/
├── app/
│   ├── main.py
│   ├── requirements.txt
│   ├── routes/
│   │   └── complaint.py
│   ├── schemas/
│   │   └── complaint.py
│   ├── data/
│   │   └── complaint_dataset.csv
│   └── services/
│       ├── classifier.py
│       ├── evaluation.py
│       ├── extractor.py
│       ├── features.py
│       ├── formatter.py
│       ├── ngram.py
│       ├── pos_tagger.py
│       ├── preprocessing.py
│       ├── sarvam.py
│       └── wordnet_utils.py
├── frontend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── api.ts
│       ├── App.tsx
│       └── components/
│           ├── ComplaintForm.tsx
│           └── OutputBox.tsx
└── README.md
```

## Environment Variables

Create `app/.env`:

```env
SARVAM_API_KEY=your_api_key_here
SARVAM_BASE_URL=https://api.sarvam.ai
```

Optional frontend API base URL in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Backend Setup

From project root:

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install backend dependencies:

```bash
pip install -r app/requirements.txt
```

Run backend server:

```bash
uvicorn app.main:app --reload
```

Backend URL: `http://localhost:8000`

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## API Reference

### POST `/process-complaint`

Request body:

```json
{
  "complaint_text": "Garbage is not being collected near MG Road Bengaluru",
  "target_language": "kn"
}
```

Response body:

```json
{
  "detected_language": "en",
  "target_language": "kn",
  "complaint_type": "garbage",
  "location": "MG Road Bengaluru",
  "final_output": "...",
  "classification_confidence": 0.73,
  "classification_method": "ml"
}
```

### GET `/classifier-metrics`

Returns model-level metrics:

- `accuracy`
- `precision`
- `recall`

## System Workflow

```text
User Input (any language)
  -> Language Detection
  -> Translation to English (Sarvam)
  -> Preprocessing
  -> Feature Extraction (BoW + TF-IDF)
  -> Hybrid Classification (ML + Rule fallback)
  -> POS/Regex Information Extraction
  -> Template-based Complaint Formatting (+ n-gram enhancement)
  -> Translation to Selected Target Language (Sarvam)
  -> PDF Download
```

## NLP Module Mapping

| Module | NLP Concept | Purpose |
| --- | --- | --- |
| `preprocessing.py` | Text normalization and token-level preprocessing | Converts noisy complaint text into analyzable tokens |
| `features.py` | BoW and TF-IDF vectorization | Produces ML-ready feature vectors |
| `classifier.py` | Supervised text classification | Predicts complaint category |
| `extractor.py` | Hybrid information extraction | Extracts complaint type, location, and issue cues |
| `pos_tagger.py` | POS tagging | Uses noun/verb cues for extraction support |
| `ngram.py` | Bigram language modeling | Improves phrasing fluency in formatted text |
| `wordnet_utils.py` | Lexical semantics and synonym expansion | Supports semantic fallback and domain matching |
| `evaluation.py` | Classification metrics | Quantifies model performance |

## Notes

- A valid Sarvam API key is required.
- Internet is required for translation API calls.
- Unicode fonts are required for accurate regional-script PDF output.
