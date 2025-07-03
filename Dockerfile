# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ ./server/

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "--loader", "tsx/esm", "server/index.ts"]
