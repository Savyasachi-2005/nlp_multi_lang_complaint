# Multilingual NLP-Based Complaint Processing and Local Language Generation System

## 📌 Overview

This project implements a multilingual NLP pipeline that accepts user complaints in any language and converts them into a structured, formal complaint in a selected regional language.

The updated system now includes local, syllabus-aligned NLP components (preprocessing, feature engineering, classification, POS analysis, n-gram modeling, WordNet semantics, and evaluation), while using Sarvam AI only for translation.

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python) |
| Frontend | React (Vite + TypeScript) |
| Styling | Tailwind CSS |
| External API | Sarvam AI (Translation & Language Processing) |

---

## 🧠 Features

- Multilingual input support (English, Hindi, Kannada, mixed)
- Automatic language detection
- Translation using Sarvam AI API (only translation stage)
- Full NLP preprocessing (normalization, tokenization, stopwords, lemmatization)
- Feature engineering using Bag-of-Words and TF-IDF
- ML classification (Logistic Regression) with rule-based fallback
- POS tagging for noun/verb linguistic cues
- Bigram language model with add-one smoothing
- WordNet-based semantic expansion and similarity
- Evaluation metrics (accuracy, precision, recall)
- Structured complaint generation without generation API dependency
- Output in regional language (Kannada / Hindi)
- PDF download of formatted complaint
- Clean and minimal UI

---

## 🏗️ Project Structure

```
project/
├── app/
│   ├── main.py
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
│       └── sarvam.py
│       └── wordnet_utils.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ComplaintForm.tsx
│   │   │   └── OutputBox.tsx
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── .env.example
└── requirements.txt
```

---

## 🔐 Environment Variables

Create a `.env` file in the `app/` directory:

```env
SARVAM_API_KEY=your_api_key_here
SARVAM_BASE_URL=https://api.sarvam.ai
```

---

## 🚀 Backend Setup

1. Create and activate a virtual environment
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the backend server:

```bash
uvicorn app.main:app --reload
```

Backend runs at: `http://localhost:8000`

---

## 💻 Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🔌 API Reference

### `POST /process-complaint`

**Request Body**

```json
{
  "complaint_text": "The road near MG Road Bengaluru is full of potholes and causing issues",
  "target_language": "kn"
}
```

**Response**

```json
{
  "detected_language": "en",
  "complaint_type": "road",
  "location": "MG Road Bengaluru",
  "final_output": "..."
}
```

---

## 🔄 System Workflow

```
User Input (any language)
        ↓
Language Detection
        ↓
Translation to English (pivot language, Sarvam)
        ↓
Preprocessing (normalize, tokenize, stopwords, lemmatize)
        ↓
Feature Extraction (BoW + TF-IDF)
        ↓
Hybrid Classification (ML + Rule fallback)
        ↓
POS + Regex-based information extraction
        ↓
Template-based complaint formatter (+ n-gram enhancement)
        ↓
Translation to Target Regional Language (Sarvam)
        ↓
PDF Download

---

## 📊 Classifier Metrics Endpoint

### `GET /classifier-metrics`

Returns current model evaluation metrics:

- Accuracy
- Precision (macro)
- Recall (macro)

---

## 🧪 NLP Module to Syllabus Concept Mapping

| Module | NLP Concept | Purpose in System |
|-------|-------------|-------------------|
| `preprocessing.py` | Text normalization, tokenization, stopword removal, lemmatization | Converts noisy complaint text into analyzable tokens |
| `features.py` | BoW, TF-IDF vector space representation | Transforms text into ML-ready numeric features |
| `classifier.py` | Supervised text classification (Logistic Regression) | Predicts complaint category |
| `extractor.py` | Hybrid IE (regex + keywords + ML) | Extracts complaint type and location robustly |
| `pos_tagger.py` | POS tagging | Uses nouns and verbs for location and action cues |
| `ngram.py` | Bigram language model with add-one smoothing | Improves complaint sentence fluency |
| `wordnet_utils.py` | Lexical semantics, synonym expansion, semantic similarity | Improves domain matching and fallback classification |
| `evaluation.py` | Classification metrics | Quantifies model performance for academic reporting |
```

---

## 📄 Output Format

The generated complaint follows a formal structure:

- **Subject** — Brief description of the issue
- **Greeting** — Formal salutation
- **Issue Description** — Detailed explanation of the complaint
- **Request for Action** — What the complainant is seeking
- **Closing** — Formal sign-off

---

## ⚠️ Notes

- A valid Sarvam AI API key is required
- An active internet connection is needed for API calls
- PDF generation requires proper Unicode font support for regional scripts

---

## 🎯 Future Improvements

- Advanced NER for more accurate location extraction
- Support for additional regional languages
- Voice input integration
- Real-time translation feedback
- User authentication and complaint tracking

---

## 👨‍💻 Author

Developed as part of an NLP microproject focusing on multilingual processing and practical application of NLP pipelines.
