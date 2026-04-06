# Multilingual NLP-Based Complaint Processing and Local Language Generation System

## Tech Stack
- Backend: FastAPI (Python)
- Frontend: React (Vite + TypeScript)
- Styling: Tailwind CSS
- External API: Sarvam AI API

## Project Structure

```
project/
├── app/
│   ├── main.py
│   ├── routes/
│   │   └── complaint.py
│   ├── schemas/
│   │   └── complaint.py
│   └── services/
│       ├── extractor.py
│       ├── formatter.py
│       └── sarvam.py
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

## Environment Variables
Create a `.env` file in the project root:

```
SARVAM_API_KEY=your_api_key_here
SARVAM_BASE_URL=https://api.sarvam.ai
```

## Backend Setup

1. Create and activate virtual environment.
2. Install dependencies:

```
pip install -r requirements.txt
```

3. Start backend:

```
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`.

## Frontend Setup

1. Move into frontend folder:

```
cd frontend
```

2. Install dependencies:

```
npm install
```

3. Start frontend:

```
npm run dev
```

Frontend runs at `http://localhost:5173`.

## API Endpoint

### POST `/process-complaint`

Request body:

```json
{
  "complaint_text": "Road is damaged near MG Road Bengaluru",
  "target_language": "kn"
}
```

Response:

```json
{
  "detected_language": "en",
  "complaint_type": "road",
  "location": "MG Road Bengaluru",
  "final_output": "...translated structured complaint..."
}
```
