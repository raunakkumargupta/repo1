# Build stage — golang:1.25-alpine already includes git + ca-certificates, no apk needed
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy go mod files and vendor directory (zero network — all deps are local)
COPY go.mod go.sum ./
COPY vendor/ vendor/

# Copy application source
COPY . .

# Build the main server binary and the seed binary using -mod=vendor (offline compile)
RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o seed scripts/seed.go

# Run stage
FROM alpine:latest

WORKDIR /app

# Copy binaries and migrations from builder
COPY --from=builder /app/server .
COPY --from=builder /app/seed .
COPY --from=builder /app/migrations ./migrations

# Copy certificates and zone info from builder (avoiding apk packages update inside docker)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080

CMD ["./server"]
