# Build Stage
FROM golang:1.25-alpine AS builder

# Install git for fetch dependencies
RUN apk add --no-cache git

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
# CGO_ENABLED=0 creates a statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/app/main.go

# Runtime Stage
FROM alpine:latest

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/server .

# Copy static assets and content
COPY --from=builder /app/static ./static
COPY --from=builder /app/contents ./contents

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./server"]
