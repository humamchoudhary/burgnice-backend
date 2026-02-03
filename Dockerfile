# Dockerfile for Express Node.js Server

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Default port (override with -e PORT=XXXX)
ENV PORT=3000
ENV NODE_ENV=production

# Expose port (documentation only - actual port set by ENV)
EXPOSE $PORT

# Start the application
CMD ["node", "server.js"]

# ===== USAGE =====
# Build: docker build -t my-express-app .
# Run: docker run -p 4000:4000 -e PORT=4000 my-express-app
