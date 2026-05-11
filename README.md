# Spring Boot Microservices
This repository contains the latest source code of the spring-boot-microservices tutorial

You can watch the tutorial on Youtube here - https://www.youtube.com/watch?v=mPPhcU7oWDU&t=20634s

## Application Architecture

![img.png](img.png)

## Building Docker Images

### Prerequisites
- Docker must be running on your machine for building Docker images
- Maven 3.8.0 or higher
- Java 21

### Build Options

#### Option 1: Build with Tests (requires Docker and full environment)
```bash
mvn clean package
```

#### Option 2: Build without Tests (recommended for CI/CD and Docker image builds)
```bash
# Using the docker-build profile
mvn clean package -Pdocker-build

# Or using Maven property
mvn clean package -DskipTests
```

#### Option 3: Build Docker Images Directly
```bash
# Build all service images (skips tests)
mvn spring-boot:build-image -Pdocker-build

# Build specific service image
mvn spring-boot:build-image -Pdocker-build -pl order-service
mvn spring-boot:build-image -Pdocker-build -pl product-service
mvn spring-boot:build-image -Pdocker-build -pl inventory-service
mvn spring-boot:build-image -Pdocker-build -pl notification-service
mvn spring-boot:build-image -Pdocker-build -pl api-gateway
```

If Testcontainers cannot access Docker, the order-service integration test now skips automatically instead of failing the build.

#### Option 4: Run Tests Locally (requires all services running)
```bash
# Start all services with Docker Compose
docker-compose up -d

# Run tests
mvn clean test

# Stop all services
docker-compose down
```

### Profiles

- **docker-build**: Skips tests and optimizes for building Docker images. Useful for CI/CD environments where Docker may not be available for running tests.
- **Docker-backed order tests**: `OrderServiceApplicationTests` automatically skips when Docker is unavailable to Testcontainers.

### Troubleshooting

**Error: "Could not find a valid Docker environment"**
- This occurs when tests try to use TestContainers (MySQL, Kafka) but Docker is not running
- Solution: Use the `docker-build` profile to skip tests: `mvn clean package -Pdocker-build`
- The order-service integration test also skips automatically if Docker cannot be reached by Testcontainers.

**Tests fail locally**
- Ensure all required services are started: `docker-compose up -d`
- Check Docker is running: `docker ps`
- Review logs: Check the surefire reports in `target/surefire-reports/`

#### Docker Hub Credentials (file-based)
1) Copy `.env.example` to `.env` and fill in your Docker Hub username and access token.
2) Load the file before running Maven.

```bash
set -a
source .env
set +a

mvn spring-boot:build-image -Pdocker-build -Ppublish-image -pl api-gateway
```
