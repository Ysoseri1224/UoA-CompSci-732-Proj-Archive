# CS732 Project – Team Works on My Machine

Welcome to the CS732 project repository. This repository contains the development environment and source code for our team project this semester.

All team members have admin access. The only setup by default is branch protection on main, requiring a pull request with at least one reviewer to modify main. Please follow good version control practices, such as feature branching, to avoid conflicts and to make your contributions clear.

## Team Members

Zengguang Feng (zfen773@aucklanduni.ac.nz)
Zihan Zhao (zahz093@aucklanduni.ac.nz)
Yi Lin (yiln257@aucklanduni.ac.nz)
Manqi Wang (mwan556@aucklanduni.ac.nz)
Zhixuan Wei (zwei974@aucklanduni.ac.nz)
Sheng Xiao (sxia092@aucklanduni.ac.nz)

# Project Overview

This project is a multiplayer card game with the following architecture:

Component	Technology
Frontend	React, Tailwind CSS, Vite
Backend	Node.js, Express
Real-time Communication	Socket.io
Game Logic	Server-side Node.js
Card Evaluation	pokersolver (npm)
Queue / Cache	Redis
Authentication	JWT (JSON Web Tokens)
Database	MongoDB
Deployment	Netlify (frontend), Render (backend)
AI Development Aid	Claude (Anthropic, via CLAUDE.md)
Development Environment

We use Docker Compose to simplify setup. The repository includes:

CardGame/frontend/ – React frontend
CardGame/backend/ – Node.js backend
CardGame/docker-compose.yml – orchestrates frontend, backend, MongoDB, Redis
Services & Access
Service	Local URL / Connection
React Frontend	http://localhost:5173

Node.js Backend	http://localhost:3000

MongoDB	mongodb://localhost:27017
Redis	localhost:6379

All services are run in Docker containers, so team members do not need to install Node.js, MongoDB, or Redis locally.

Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/UOA-CS732-S1-2026/group-project-works-on-my-machine.git
cd group-project-works-on-my-machine
```

2. Configure environment variables:
```bash
cp CardGame/backend/.env.example CardGame/backend/.env
# Edit .env and fill in your actual values (JWT_SECRET, etc.)
```

3. Start the Docker development environment:
```bash
docker compose -f CardGame/docker-compose.yml up -d
```

This command pulls necessary Docker images and starts all services (frontend, backend, MongoDB, Redis).

- Use `docker compose stop` to temporarily stop containers.
- Use `docker compose down` to stop and remove containers (`-v` to also remove volumes).

4. Access the services:
- React frontend: http://localhost:5173
- Node.js backend: http://localhost:3000
- MongoDB: mongodb://localhost:27017
- Redis: localhost:6379

Database Tests

Run backend database/model tests against the dedicated `balatro_test` database:

```bash
cd CardGame/backend
npm run test:db
```

The test suite uses `TEST_MONGO_URI` when provided and defaults to `mongodb://127.0.0.1:27017/balatro_test`.

See [CardGame/docs/testing.md](CardGame/docs/testing.md) for the full testing workflow.

Documentation

| Document | Description |
|----------|-------------|
| [docs/api.md](CardGame/docs/api.md) | REST API interface specification |
| [docs/socket.md](CardGame/docs/socket.md) | Socket.io event protocol |
| [docs/testing.md](CardGame/docs/testing.md) | Backend testing workflow and directory conventions |
| [requirement.md](requirement.md) | Full software requirements |

Version Control Guidelines

- Always use **feature branches** for new functionality or fixes.
- Branch naming: `feature/<name>`, `fix/<name>`, `docs/<name>`
- Commit message format: `feat:`, `fix:`, `docs:`, `refactor:` prefix (Conventional Commits)
- Create a **pull request (PR)** when merging to main.
- At least **one team member** must review and approve the PR before merging.
- Keep `node_modules`, build outputs, and Docker volume data out of the repository via `.gitignore`.

Additional Notes

- `.env` files with secrets must **never** be committed. Use `.env.example` as a template.
- For MongoDB or Redis persistent data, Docker volumes are used and ignored by Git.
- The project is fully Dockerized — anyone on the team can get started with a single `docker compose up -d`.
