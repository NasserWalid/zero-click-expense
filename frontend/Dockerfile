# Next.js 16 requires Node >= 20.9, so node:18-alpine cannot build this app.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
