FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p data

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/app.js"]
