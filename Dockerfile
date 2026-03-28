FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci

COPY client/ client/
COPY server/ server/
RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci -w server --omit=dev

COPY --from=build /app/client/dist client/dist
COPY --from=build /app/server/dist server/dist
COPY server/config.yaml server/config.yaml

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/dist/main.js"]
