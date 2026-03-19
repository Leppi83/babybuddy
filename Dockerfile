# Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

ARG BUILD_HASH=dev
ENV BUILD_HASH=${BUILD_HASH}

# System deps (für Pillow + Build)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    nodejs \
    npm \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    libpng-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    tk-dev \
    curl \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# pip/packaging aktualisieren
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Node dependencies — copy manifests first so this layer is cached unless deps change
COPY package.json package-lock.json /app/
COPY frontend/package.json frontend/package-lock.json /app/frontend/
RUN npm ci && cd /app/frontend && npm ci

# App Code
COPY . /app

# Frontend assets (SCSS/JS) — node_modules already installed above
# Gulp builds into babybuddy/static/babybuddy/*.
# Sync into /app/static/babybuddy/* because FileSystemFinder prefers /app/static.
RUN npx gulp build \
    && cd /app/frontend && npm run build \
    && mkdir -p /app/static/babybuddy \
    && cp -a /app/babybuddy/static/babybuddy/. /app/static/babybuddy/

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
