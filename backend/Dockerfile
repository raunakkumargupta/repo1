# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install git and certificates
RUN apk add --no-cache git ca-certificates

# Copy go mod files first to leverage build cache
COPY go.mod go.sum ./
RUN go mod download

# Copy application source
COPY . .

# Build the main server binary and the seed binary
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -o seed seed.go

# Run stage
FROM alpine:latest

WORKDIR /app

RUN apk update && apk upgrade --no-cache && apk add --no-cache ca-certificates tzdata

# Copy binaries and migrations from builder
COPY --from=builder /app/server .
COPY --from=builder /app/seed .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

CMD ["./server"]
