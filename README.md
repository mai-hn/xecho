# xEcho

xEcho is a modern personal website and project lab built with Next.js. It includes a white, technology-focused landing page, animated particle-ray hero, project and tool sections, and a model testing console for OpenAI-compatible APIs.

## Features

- Personal homepage with modern white tech visual style
- Canvas particle-ray animation hero
- shadcn-style UI utilities and responsive layouts
- Motion-powered reveal animations
- Magic UI globe visual
- `/projects` project index page
- `/projects/model-test` model testing console
- FastAPI backend with SQLModel and SQLite persistence
- ECharts dashboards for latency, status, and token usage

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript
- Styling: Tailwind CSS v4, CSS Modules, shadcn, Magic UI
- Motion and visuals: `motion`, ECharts, canvas
- Backend: FastAPI, SQLModel, SQLite, httpx
- Python runtime: `uv`

## Routes

- `/` - personal homepage
- `/projects` - project index
- `/projects/model-test` - model testing console

## Model Testing Console

The model testing console supports:

- Add, edit, enable, disable, and delete OpenAI-compatible API configurations
- Store API base URLs and API keys in the backend SQLite database
- Fetch models from an OpenAI-compatible `/models` endpoint
- Manually add models
- Enable or disable models
- Configure test input, max tokens, temperature, global concurrency, and per-API concurrency
- Run batch tests against enabled models
- Persist test results in the database
- View latency, status, and token charts
- Open request and response details for each result

The frontend does not ship default API/model/result data. It reads state from the backend database through:

```text
GET /project/model-test/state
```

## Getting Started

Install frontend dependencies:

```bash
npm install
```

Run the Next.js app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Backend Setup

The backend lives in `backend/` and uses `uv`.

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

Health check:

```text
http://localhost:8000/health
```

The SQLite database is created automatically at:

```text
backend/data/model_test.db
```

Local database files are ignored by git.

## Environment Variables

The frontend calls the backend at `http://localhost:8000` by default.

Override it with:

```bash
NEXT_PUBLIC_MODEL_TEST_API=http://localhost:8000
```

## Backend API

Model test API prefix:

```text
/project/model-test
```

Endpoints:

- `GET /project/model-test/state`
- `POST /project/model-test/apis`
- `PATCH /project/model-test/apis/{api_id}`
- `DELETE /project/model-test/apis/{api_id}`
- `POST /project/model-test/apis/{api_id}/fetch-models`
- `POST /project/model-test/models`
- `PATCH /project/model-test/models/{model_id}`
- `DELETE /project/model-test/models/{model_id}`
- `POST /project/model-test/tests/batch`
- `DELETE /project/model-test/results`

## OpenAI-Compatible API Notes

Use a base URL like:

```text
https://api.openai.com/v1
```

Do not use the full models endpoint as the base URL:

```text
https://api.openai.com/v1/models
```

The backend is tolerant of accidental `/models` suffixes, but the root `/v1` style is recommended.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Backend validation:

```bash
cd backend
uv run python -m compileall main.py project
```

## Project Structure

```text
app/
  page.tsx
  projects/
    page.tsx
    model-test/
      page.tsx
    _components/
      model-tester.tsx
      model-tester.module.css
backend/
  main.py
  project/
    model_test/
      database.py
      models.py
      router.py
      schemas.py
components/
  ui/
lib/
```

## Notes

- The global header is shared from `app/layout.tsx`.
- The model test implementation uses `backend/project/model_test` because Python packages cannot contain hyphens.
- The HTTP route remains `/project/model-test`.
