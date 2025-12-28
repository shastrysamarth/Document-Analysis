# Document Intelligence Platform

A full-stack **document ingestion, extraction, and review system** built with Next.js, Prisma, PostgreSQL + pgvector, and modern LLM tooling.

This platform ingests PDFs and text files, extracts content, performs schema discovery and structured field extraction using LLMs, stores semantic embeddings for retrieval, and provides a clean human-in-the-loop review interface.

---

## ✨ Features

- **Document Upload & Preview**
  - Upload PDFs or text files
  - Scrollable, native PDF preview before ingestion

- **Text Extraction**
  - Reliable text extraction from text-based PDFs
  - Sanitization for database safety
  - Pluggable OCR pipeline (ready for Textract / Tesseract)

- **LLM-Powered Intelligence**
  - Automatic document type classification
  - Schema discovery using LLMs
  - Structured field extraction (resumes, cover letters, invoices, etc.)
  - Per-field confidence scoring

- **Semantic Search Foundation**
  - Embeddings stored with `pgvector`
  - Ready for similarity search and retrieval workflows

- **Review Workflow**
  - `/review` lists all ingested documents
  - `/review?doc=<id>` shows detailed document view
  - Human-in-the-loop inspection and validation

- **Production-Ready Backend**
  - PostgreSQL + Prisma ORM
  - Deterministic migrations
  - Safe handling of large documents
  - Node runtime for binary processing

---

## 🧱 Tech Stack

**Frontend**
- Next.js (App Router)
- React
- Tailwind CSS
- shadcn/ui

**Backend**
- Next.js Route Handlers
- Prisma ORM
- PostgreSQL
- pgvector

**AI / ML**
- OpenAI API
- JSON-schema constrained outputs
- Embeddings for semantic retrieval

---

## 📂 Project Structure

```bash
app/
upload/ Upload and preview UI
review/ Document list and review pages
api/
ingest/ Ingestion pipeline

lib/
db.ts Prisma client
ocr/ Text extraction
llm/ Schema discovery and extraction
vector/ Embedding logic
safety/ PII redaction
text/ Text sanitization

prisma/
schema.prisma Database schema
```

---



## Getting Started

### Install dependencies
```bash
npm install
```

## Environment Variables
Create a `.env` file:
```env
DATABASE_URL=postgresql://<user>@localhost:5432/postgres
OPENAI_API_KEY=your_openai_key
```

## Enable PGVector
```bash
psql -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## Run Migrations
```bash
npx prisma migrate dev
```

## Ingestion Pipeline Overview

1. User uploads a document
2. Text is extracted and sanitized
3. PII redaction is applied
4. LLM discovers schema and extracts structured fields
5. Embeddings are generated and stored
6. Document is marked REVIEW_REQUIRED
7. User reviews extracted output in the UI
