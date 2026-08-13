FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || true
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
