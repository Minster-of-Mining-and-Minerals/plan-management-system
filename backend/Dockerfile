FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 4000 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
