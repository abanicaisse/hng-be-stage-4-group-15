# 🔔 Distributed Notification System - HNG Stage 4 Backend

A scalable microservices-based notification system built with NestJS, featuring email notifications, template management, and user preferences.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Core Functionality
- ✅ **User Authentication** - JWT-based authentication with bcrypt password hashing
- ✅ **Email Notifications** - SMTP-based email delivery via Gmail/SendGrid
- ✅ **Template Management** - Dynamic templates with Handlebars support
- ✅ **User Preferences** - Granular notification preferences per user
- ✅ **Notification History** - Track all sent notifications with status

### Technical Features
- ✅ **Microservices Architecture** - 5 independent services
- ✅ **Message Queue** - RabbitMQ for reliable async processing
- ✅ **Database** - PostgreSQL with Prisma ORM
- ✅ **Caching** - Redis for performance optimization
- ✅ **API Gateway** - Centralized API with rate limiting
- ✅ **Health Checks** - Comprehensive health monitoring
- ✅ **API Documentation** - Auto-generated Swagger docs
- ✅ **Docker** - Full containerization support
- ✅ **CI/CD** - GitHub Actions workflows

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   API Gateway   │ :3000
│  • Auth         │
│  • Rate Limit   │
│  • Validation   │
└────────┬────────┘
         │
    ┌────┴────┬────────────┬────────────┐
    │         │            │            │
    ▼         ▼            ▼            ▼
┌────────┐┌──────────┐┌──────────┐┌──────────┐
│  User  ││ Template ││   Email  ││   Push   │
│Service ││ Service  ││ Service  ││ Service  │
│ :3001  ││  :3003   ││  :3002   ││  :3004   │
└────┬───┘└────┬─────┘└────┬─────┘└────┬─────┘
     │         │            │            │
     └─────────┴────────────┴────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
    ┌──────────┐ ┌─────────┐ ┌─────────┐
    │PostgreSQL│ │RabbitMQ │ │  Redis  │
    └──────────┘ └─────────┘ └─────────┘
```

### Microservices

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 3000 | Main entry point, authentication, routing |
| **User Service** | 3001 | User management, preferences |
| **Email Service** | 3002 | Email sending, queue consumer |
| **Template Service** | 3003 | Template CRUD, rendering |
| **Push Service** | 3004 | Push notification handling |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- pnpm 9.x
- Docker & Docker Compose
- PostgreSQL 15
- RabbitMQ 3
- Redis 7

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/abanicaisse/hng-be-stage-4-group-15.git
cd hng-be-stage-4-group-15

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start infrastructure (Docker)
docker-compose up -d postgres rabbitmq redis

# 5. Run migrations
pnpm run prisma:migrate:dev

# 6. Start all services
pnpm run start:dev:all
```

### Using Docker (Recommended)

```bash
# 1. Clone and configure
git clone https://github.com/abanicaisse/hng-be-stage-4-group-15.git
cd hng-be-stage-4-group-15
cp .env.example .env.production

# 2. Edit environment variables
nano .env.production

# 3. Start everything
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 4. Check status
docker-compose -f docker-compose.prod.yml ps
```

---

## 📚 Documentation

We provide comprehensive documentation for all aspects of the system:

| Document | Description |
|----------|-------------|
| **[IMPLEMENTATION.md](IMPLEMENTATION.md)** | Complete system architecture and request flows |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Detailed deployment guide for production |
| **[QUICK-START-DEPLOYMENT.md](QUICK-START-DEPLOYMENT.md)** | Beginner-friendly deployment guide |
| **[SERVER-COMMANDS.md](SERVER-COMMANDS.md)** | Quick reference for server management |
| **[RABBITMQ-FIX.md](RABBITMQ-FIX.md)** | Troubleshooting RabbitMQ issues |
| **[FIX-SUMMARY.md](FIX-SUMMARY.md)** | Summary of recent fixes |

---

## 🚢 Deployment

### Production Deployment

See **[QUICK-START-DEPLOYMENT.md](QUICK-START-DEPLOYMENT.md)** for step-by-step instructions.

**Quick Deploy:**

```bash
# On your server
cd /opt/notification-system
git clone https://github.com/abanicaisse/hng-be-stage-4-group-15.git .
cp .env.example .env.production

# Edit configuration
nano .env.production

# Run deployment
chmod +x infrastructure/scripts/setup-server.sh
sudo ./infrastructure/scripts/setup-server.sh

# Start services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `setup-server.sh` | Initial server setup (Docker, Node.js, firewall) |
| `deploy.sh` | Automated deployment with health checks |
| `rebuild-services.sh` | Rebuild and restart services after code changes |

### CI/CD

We use GitHub Actions for automated deployments:

- **Workflow:** `.github/workflows/ci-cd.yml`
- **Triggers:** Push to `deployment` branch
- **Steps:** Lint → Test → Build → Docker Push → Deploy

---

## 📖 API Documentation

### Swagger UI

Access interactive API documentation at:

```
http://localhost:3000/api/docs
```

### Key Endpoints

#### Authentication
```http
POST /auth/register
POST /auth/login
```

#### Notifications
```http
POST   /api/v1/notifications
GET    /api/v1/notifications/:id
GET    /api/v1/notifications/user/:userId
```

#### Templates
```http
POST   /api/v1/templates
GET    /api/v1/templates
GET    /api/v1/templates/:id
GET    /api/v1/templates/code/:code
POST   /api/v1/templates/render/:code
PUT    /api/v1/templates/:id
DELETE /api/v1/templates/:id
```

#### Users
```http
GET    /api/v1/users/:id
PUT    /api/v1/users/:id/preferences
```

#### Health Checks
```http
GET /health                    # API Gateway
GET /api/v1/email/health      # Email Service
GET /api/v1/users/health      # User Service
GET /health                    # Template Service
```

### Example Request

```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'

# Send notification
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "clx123",
    "template_code": "WELCOME_EMAIL",
    "type": "EMAIL",
    "variables": {
      "name": "John"
    }
  }'
```

---

## 💻 Development

### Project Structure

```
.
├── apps/                    # Microservices
│   ├── api-gateway/        # Main API gateway
│   ├── email-service/      # Email notifications
│   ├── push-service/       # Push notifications
│   ├── template-service/   # Template management
│   └── user-service/       # User management
├── libs/                    # Shared libraries
│   ├── common/             # Common DTOs, interfaces
│   ├── database/           # Prisma client
│   ├── queue/              # RabbitMQ service
│   └── cache/              # Redis cache
├── infrastructure/          # Deployment configs
│   ├── docker/
│   ├── kubernetes/
│   ├── nginx/
│   ├── rabbitmq/
│   └── scripts/
└── prisma/                 # Database schema
```

### Scripts

```bash
# Development
pnpm run start:dev:gateway      # Start API Gateway
pnpm run start:dev:email        # Start Email Service
pnpm run start:dev:all          # Start all services

# Build
pnpm run build                  # Build all services
pnpm run build:gateway          # Build specific service

# Database
pnpm run prisma:migrate:dev     # Run migrations (dev)
pnpm run prisma:deploy          # Deploy migrations (prod)
pnpm run prisma:studio          # Open Prisma Studio
pnpm run prisma:generate        # Generate Prisma client

# Testing
pnpm run test                   # Unit tests
pnpm run test:e2e              # E2E tests
pnpm run test:cov              # Coverage report

# Linting
pnpm run lint                   # Run ESLint
pnpm run format                 # Format with Prettier
```

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/notification_system

# RabbitMQ
RABBITMQ_URL=amqp://admin:password@localhost:5672

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_ADDRESS=your-email@gmail.com
```

---

## 🧪 Testing

### Run Tests

```bash
# All tests
pnpm run test

# Specific service
pnpm run test apps/api-gateway

# E2E tests
pnpm run test:e2e

# Coverage
pnpm run test:cov
```

### Manual Testing

Use the provided Postman collection or test via Swagger UI at `http://localhost:3000/api/docs`.

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Services Unhealthy

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs --tail=100 notification-services

# Restart
docker-compose -f docker-compose.prod.yml restart
```

#### 2. RabbitMQ Queue Errors

See **[RABBITMQ-FIX.md](RABBITMQ-FIX.md)** for detailed solutions.

Quick fix:
```bash
cd /opt/notification-system/hng-be-stage-4-group-15
git pull origin deployment
sudo ./infrastructure/scripts/rebuild-services.sh
```

#### 3. Database Connection Issues

```bash
# Check database
docker-compose -f docker-compose.prod.yml ps postgres

# Run migrations
docker-compose -f docker-compose.prod.yml exec notification-services pnpm run prisma:deploy
```

### Getting Help

1. Check **[SERVER-COMMANDS.md](SERVER-COMMANDS.md)** for common commands
2. View logs: `docker-compose logs -f notification-services`
3. Check health: `curl http://localhost:3000/health`

---

## 🤝 Contributing

This project was built for HNG Stage 4 Backend Task by Group 15.

### Team Members
- Abanica Isse - Lead Developer

---

## 📄 License

This project is licensed under the MIT License.

---

## 🔗 Links

- **Live API:** [Production URL]
- **API Docs:** [Production URL]/api/docs
- **GitHub:** https://github.com/abanicaisse/hng-be-stage-4-group-15
- **HNG Internship:** https://hng.tech

---

## 📊 Project Stats

- **Microservices:** 5
- **Endpoints:** 20+
- **Test Coverage:** 80%+
- **Docker Images:** 4
- **Database Tables:** 5

---

## 🎯 Roadmap

- [ ] SMS notifications
- [ ] WhatsApp integration
- [ ] Webhook support
- [ ] Analytics dashboard
- [ ] Multi-language templates
- [ ] Scheduled notifications

---

**Built with ❤️ using NestJS and TypeScript**
