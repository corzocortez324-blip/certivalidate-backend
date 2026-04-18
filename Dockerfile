FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Evita que postinstall ejecute prisma generate en build-time
RUN npm ci --omit=dev --ignore-scripts

COPY src ./src

# Genera Prisma y corre migraciones ya con variables disponibles en runtime
CMD ["sh", "-c", "npx prisma generate && npm run migrate && node src/index.js"]
