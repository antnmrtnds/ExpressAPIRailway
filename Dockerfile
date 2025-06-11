FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY tsconfig.json ./tsconfig.json
COPY package.json ./package.json
COPY src/ ./src/

# Install ALL dependencies (including dev) for building
RUN npm install

# Copy source code
COPY api-gateway/src/ ./src/

# Build the application
RUN npm run build

# Clean install only production dependencies for runtime
RUN npm install --only=production && npm cache clean --force

EXPOSE 3000

CMD ["npm", "start"] 