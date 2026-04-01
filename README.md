CS732 Project – Team Works on My Machine

Welcome to the CS732 project repository. This repository contains the development environment and source code for our team project this semester.

All team members have admin access. The only setup by default is branch protection on main, requiring a pull request with at least one reviewer to modify main. Please follow good version control practices, such as feature branching, to avoid conflicts and to make your contributions clear.

Team Members
Zengguang Feng (zfen773@aucklanduni.ac.nz
)
Zihan Zhao (zahz093@aucklanduni.ac.nz
)
Yi Lin (yiln257@aucklanduni.ac.nz
)
Manqi Wang (mwan556@aucklanduni.ac.nz
)
Zhixuan Wei (zwei974@aucklanduni.ac.nz
)
Sheng Xiao (sxia092@aucklanduni.ac.nz
)
Project Overview

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

myapp/frontend/ – React frontend
myapp/backend/ – Node.js backend
myapp/docker-compose.yml – orchestrates frontend, backend, MongoDB, Redis
Services & Access
Service	Local URL / Connection
React Frontend	http://localhost:5173

Node.js Backend	http://localhost:3000

MongoDB	mongodb://localhost:27017
Redis	localhost:6379

All services are run in Docker containers, so team members do not need to install Node.js, MongoDB, or Redis locally.

Setup Instructions
Clone the repository:
git clone https://github.com/your-username/group-project-works-on-my-machine.git
cd group-project-works-on-my-machine
Start the Docker development environment:
docker compose up -d
This command pulls necessary Docker images and starts all services.
Use docker compose stop to temporarily stop containers.
Use docker compose down to stop and remove containers (use -v to also remove volumes).
Access the services:
React frontend: http://localhost:5173
Node.js backend: http://localhost:3000
MongoDB & Redis: connect using the local host and ports above
Version Control Guidelines
Always use feature branches for new functionality or fixes.
Create a pull request (PR) when merging to main.
At least one team member must review the PR before merging.
Commit messages should be clear and descriptive.
Keep local node_modules, build outputs, and Docker volume data out of the repository by using .gitignore.
Additional Notes
.env files with secrets should not be committed. Use .env.example as a template.
For MongoDB or Redis persistent data, Docker volumes are used, which are ignored by Git.
The project is fully Dockerized, so anyone on the team can get started with a single docker compose up -d.