FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server.js scenarios.js terminal.html admin.html ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
