FROM python:3.10-slim

WORKDIR /app

COPY . .

RUN apt-get update && apt-get install -y curl && apt-get clean

RUN pip install uv

RUN uv pip install --group main --system

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
