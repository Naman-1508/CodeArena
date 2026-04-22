FROM node:18-alpine

# Install Docker CLI inside container (for Docker-in-Docker)
RUN apk add --no-cache docker-cli

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

# Create tmp directory for code execution
RUN mkdir -p /app/tmp

CMD ["node", "src/worker.js"]
