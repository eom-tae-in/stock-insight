FROM ghcr.io/astral-sh/uv:0.9.5 AS uv
FROM python:3.13-slim
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY src ./src
RUN groupadd --gid 10001 worker && useradd --uid 10001 --gid worker --no-create-home worker
USER worker
ENV PYTHONPATH=/app/src
CMD ["/app/.venv/bin/python", "-m", "trends_worker"]
