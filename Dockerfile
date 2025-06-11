FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json .
COPY package-lock.json .

# Copy TypeScript config
COPY tsconfig.json .

# Copy source code
COPY src/ ./src/

# Install ALL dependencies (including dev) for building
RUN npm install

# Build the application
RUN npm run build

# Clean install only production dependencies for runtime
RUN npm install --only=production && npm cache clean --force

EXPOSE 3000

CMD ["npm", "start"] 