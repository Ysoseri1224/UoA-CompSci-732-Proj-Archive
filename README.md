# Wild Hand: SkillFlop

[![Node.js 18+](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-enabled-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Node.js CI](https://github.com/UOA-CS732-S1-2026/group-project-works-on-my-machine/actions/workflows/nodejs-ci.yml/badge.svg?branch=main&event=push)](https://github.com/UOA-CS732-S1-2026/group-project-works-on-my-machine/actions/workflows/nodejs-ci.yml)

A browser-based card game project that combines Texas Hold'em mechanics with a skill-driven battle layer, built with React, ExpressJS, Node.js, Socket.io, MongoDB, and Docker Compose.

## Overview

Wild Hand: SkillFlop was developed as a course project for COMPSCI 732 Software Tools and Techniques by Team Works on My Machine.

The repository contains the application source code, tests, configuration, and supporting technical documentation. This README is intentionally lightweight: it provides the main project entry points, while detailed design, protocol, and testing notes live in `CardGame/docs/`.

## Current Features

- Authentication and protected routes
- PvE gameplay flow with pre-battle skill selection
- Profile, leaderboard, and match-related backend support
- Local full-stack development with Docker Compose and CI-backed backend validation

## Online Demo

A live demo is available at **[45.32.246.24:5173](http://45.32.246.24:5173)** 

simply register and log in. This instance runs on Vultr.

## Quick Start

### Clone the Repository

```bash
git clone https://github.com/UOA-CS732-S1-2026/group-project-works-on-my-machine.git
cd group-project-works-on-my-machine
```

### Configure Environment Files

```bash
cp CardGame/backend/.env.example CardGame/backend/.env
cp CardGame/frontend/.env.example CardGame/frontend/.env
```

### Start the Local Stack

```bash
docker compose -f CardGame/docker-compose.yml up -d
```

This starts the frontend, backend, MongoDB, and Redis services required for local development and testing.

### Start the Frontend and Backend Manually

Backend:

```bash
cd CardGame/backend
npm install
npm run dev
```

Frontend:

```bash
cd CardGame/frontend
npm install
npm run dev
```

When running the applications manually, make sure MongoDB and Redis are available and that the backend and frontend environment files have been configured first.

### Local Service Endpoints

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`
- Redis: `localhost:6379`

## Deployment Status

### Local Deployment

The project supports local full-stack deployment through Docker Compose, as described above.

### Hosted Deployment

Hosted deployment details are not currently documented in this repository. If a live deployment is made available, the public URLs and hosting notes should be added here.

## Testing

Backend test and lint commands:

```bash
cd CardGame/backend
npm run lint
npm test
```

Frontend test and lint commands:

```bash
cd CardGame/frontend
npm run lint
npm test
```

## Documentation

Detailed project documentation is available in `CardGame/docs/`:

- [API documentation](CardGame/docs/api.md) - implemented backend REST API reference, including auth, leaderboard, match, achievement, and rogue endpoints
- [Socket protocol](CardGame/docs/socket.md) - Socket.io event contract between frontend and backend for PvE and lobby flows
- [Testing workflow](CardGame/docs/testing.md) - backend test layout, entry points, and database test conventions
- [State machine notes](CardGame/docs/state-machine.md) - gameplay state and turn-flow design for the card battle loop
- [Card abstractions](CardGame/docs/card-abstractions.md) - shared card, deck, hand, buff, and boss data model design
- [Backend game logic plan](CardGame/docs/GameLogic_backend.md) - step-by-step backend implementation roadmap and status notes
- [Language convention](CardGame/docs/language.md) - project rule that all user-facing text must be in English
- [Logging API](CardGame/docs/logger.md) - manual logging conventions for route handlers, middleware, and global flows
- [i18n glossary](CardGame/docs/i18n-glossary.md) - canonical English terminology for user-facing game text
- [Frontend specification](CardGame/docs/frontend-spec.md) - frontend architecture, route map, state ownership, and user-facing page flows

## Repository Structure

- `CardGame/frontend/` - React frontend application
- `CardGame/backend/` - backend API, gameplay services, and persistence logic
- `CardGame/docker-compose.yml` - local development environment setup
- `.github/workflows/` - continuous integration workflows

## Team

- **Zhixuan Wei** — Full-Stack Developer, Game Systems Engineer, Documentation Maintainer
- **Sheng Xiao** — Full-Stack Developer, DevOps Engineer, Repository Maintainer
- **Yi Lin** — Data Modeling Engineer, Audio Systems Developer
- **Zengguang Feng** — Lead Frontend Engineer, UX Designer
- **Zihan Zhao** — Game UI Developer, Visual Effects Designer
- **Manqi Wang** — QA & Integration Lead, Rogue Mode Specialist
