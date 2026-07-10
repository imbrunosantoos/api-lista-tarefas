# --- build stage -------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# --- runtime stage ------------------------------------------------------
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

# apply pending migrations before starting the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
