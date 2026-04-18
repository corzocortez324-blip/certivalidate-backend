FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos y schema antes de npm ci para que postinstall (prisma generate) funcione
COPY package*.json ./
COPY prisma ./prisma

# --omit=dev excluye devDeps; postinstall ejecuta prisma generate automáticamente
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
