# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install dependencies (ignoring scripts/engines if necessary)
RUN npm ci

# Copy application source
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV BACKEND_API_URL=http://backend:8080
ENV NEXT_PUBLIC_API_URL=/api

ARG NEXT_PUBLIC_COMETCHAT_APP_ID
ARG NEXT_PUBLIC_COMETCHAT_REGION
ARG NEXT_PUBLIC_COMETCHAT_AUTH_KEY

ENV NEXT_PUBLIC_COMETCHAT_APP_ID=$NEXT_PUBLIC_COMETCHAT_APP_ID
ENV NEXT_PUBLIC_COMETCHAT_REGION=$NEXT_PUBLIC_COMETCHAT_REGION
ENV NEXT_PUBLIC_COMETCHAT_AUTH_KEY=$NEXT_PUBLIC_COMETCHAT_AUTH_KEY

# Build the application
RUN npm run build

# Run stage
FROM node:22-alpine AS runner

# Patch OS vulnerabilities and upgrade global npm to fix tar/minimatch CVEs
RUN apk update && apk upgrade --no-cache && npm install -g npm@latest

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BACKEND_API_URL=http://backend:8080
ENV NEXT_PUBLIC_API_URL=/api

# Copy build artifacts and node_modules from builder stage
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "start"]
