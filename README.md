# Didik's Blog

This project aims to be my personal blog website.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Go 1.25+ (for local development)

### Running the Project

```bash
docker-compose up --build
```

The server will start at `http://localhost:8080`.

## Deployment

For CI/CD and deployment instructions, please refer to [DEPLOYMENT.md](DEPLOYMENT.md).

## Load Testing

We use [k6](https://k6.io/) for load testing.

### Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed

### Running the Test

```bash
k6 run k6/load_test.js
```

### Benchmarks

- **MacBook Air M2**: ~12,000 RPS (Requests Per Second)
