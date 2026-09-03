FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8100

ENV PORT=8100

# Use a shell so cloud-provided PORT is expanded; default to the local port.
CMD ["sh", "-c", "exec python run.py --host 0.0.0.0 --port ${PORT:-8100}"]
