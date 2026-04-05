FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev

COPY backend ./backend
COPY frontend ./frontend

ENV NODE_ENV=production
ENV PORT=4000
ENV SERVE_FRONTEND=true

EXPOSE 4000

CMD ["npm", "--prefix", "backend", "start"]
