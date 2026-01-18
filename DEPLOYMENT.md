# Deployment Guide

This guide explains how to set up the CI/CD pipeline so that pushing to the `main` branch automatically updates your server.

## Prerequisites

1.  **Docker Hub Account**: You need an account at [hub.docker.com](https://hub.docker.com/).
2.  **Server**: A VPS (e.g., DigitalOcean, AWS, Linode) with Docker installed.
3.  **GitHub Repository**: Your project must be hosted on GitHub.

## Step 1: Configure GitHub Secrets

Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.

Add the following secrets:

-   `DOCKERHUB_USERNAME`: Your Docker Hub username.
-   `DOCKERHUB_TOKEN`: Your Docker Hub Access Token (Create at Docker Hub -> Account Settings -> Security -> New Access Token).
-   `SERVER_HOST`: The IP address of your server (e.g., `123.45.67.89`).
-   `SERVER_USER`: The SSH username (usually `root` or `ubuntu`).
-   `SSH_PRIVATE_KEY`: Your SSH private key content (the one that accesses the server).

## Step 2: Push to Main

Once you have set these secrets, any commit pushed to the `main` branch will trigger the **Deploy to Server** workflow.

1.  GitHub Actions will build the Docker image.
2.  It will push the image to Docker Hub (`your-username/didik-blog:latest`).
3.  It will SSH into your server, pull the new image, and restart the container.

## Local Testing (Docker Compose)

To run the application locally using Docker:

```bash
docker-compose up --build
```

Access at `http://localhost:8080`.
