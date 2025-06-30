FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk --no-cache add curl

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy app files
COPY public/ ./public/
COPY src/ ./src/

EXPOSE 4000

ENV PORT=4000
ENV WDS_SOCKET_PORT=0

# Use environment variables from docker-compose at runtime
CMD ["npm", "start"]
