# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build && cp -r src/migrations dist/migrations

# ---- runtime ----
# Debian: Piper binar glibc talab qiladi (Alpine/musl'da ishlamaydi)
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# ffmpeg: WebM remux va MP3; curl: healthcheck va yuklab olish
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
# Piper TTS (neyron "imtihonchi ovozi") + ingliz ovozi (en_US-lessac-medium, ~60 MB)
ARG PIPER_VERSION=2023.11.14-2
RUN mkdir -p /opt/piper/voices \
 && curl -fsSL "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_x86_64.tar.gz" | tar xz -C /opt \
 && curl -fsSL -o /opt/piper/voices/en_US-lessac-medium.onnx \
      "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx" \
 && curl -fsSL -o /opt/piper/voices/en_US-lessac-medium.onnx.json \
      "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" \
 && echo "Hello. This is a test." | /opt/piper/piper --model /opt/piper/voices/en_US-lessac-medium.onnx --output_file /tmp/t.wav \
 && rm -f /tmp/t.wav
ENV PIPER_BIN=/opt/piper/piper PIPER_VOICE_DIR=/opt/piper/voices PIPER_VOICE=en_US-lessac-medium
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "dist/index.js"]
