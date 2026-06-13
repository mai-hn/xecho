# xEcho Backend

FastAPI backend for xEcho project tools.

It currently powers the `/projects/model-test` frontend route with SQLModel-backed API configuration, model configuration, and test result persistence.

## Run

```bash
uv sync
uv run uvicorn main:app --reload --port 8000
```

## Health Check

```text
GET /health
```

The model test API is mounted under:

```text
/project/model-test
```

The SQLite database is created automatically at `backend/data/model_test.db`.

## Model Test Endpoints

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
