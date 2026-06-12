#!/bin/bash
# =============================================================================
# Matrix Hackathon Platform — Mac Setup Script
# Run this from the repo root on your Mac
# =============================================================================

set -e  # Exit on any error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Matrix Command — Mac Docker Setup             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── 1. Check Prerequisites ──────────────────────────────────────────────────
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Install Docker Desktop for Mac first.${NC}"
    echo "  https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker daemon not running. Start Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# ─── 2. Check service account file ──────────────────────────────────────────
echo -e "${YELLOW}[2/6] Checking Firebase service account...${NC}"

if [ ! -f "firebase-service-account.json" ]; then
    echo -e "${RED}✗ firebase-service-account.json not found in current directory.${NC}"
    echo ""
    echo "  Copy it here with:"
    echo "  cp ~/Downloads/project-1-bcd0f-firebase-adminsdk-fbsvc-0c98974e73.json ./firebase-service-account.json"
    echo ""
    read -p "  Do you want to copy it now from ~/Downloads? (y/n): " confirm
    if [[ $confirm == "y" || $confirm == "Y" ]]; then
        SA_FILE=$(ls ~/Downloads/project-1-bcd0f-firebase-adminsdk-*.json 2>/dev/null | head -1)
        if [ -n "$SA_FILE" ]; then
            cp "$SA_FILE" ./firebase-service-account.json
            echo -e "${GREEN}✓ Copied service account key${NC}"
        else
            echo -e "${RED}✗ Could not find service account JSON in ~/Downloads${NC}"
            exit 1
        fi
    else
        exit 1
    fi
else
    echo -e "${GREEN}✓ firebase-service-account.json found${NC}"
fi

# ─── 3. Check .env file ──────────────────────────────────────────────────────
echo -e "${YELLOW}[3/6] Checking .env file...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found. Creating from template...${NC}"
    cat > .env << 'EOF'
# Database
DB_URL=postgresql://postgres:postgres@postgres:5432/hackathon?sslmode=disable
DB_MAX_CONNS=10
DB_MIN_CONNS=2

# Redis
REDIS_URL=redis://redis:6379

# Server
PORT=8080
JWT_SECRET=super-secret-jwt-key-change-this-in-production

# CORS — update with your Mac's LAN IP
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Worker Pool
WORKER_POOL_SIZE=5

# Firebase (path inside the container)
FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-service-account.json

# Frontend API
BACKEND_API_URL=http://backend:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
EOF
    echo -e "${GREEN}✓ Created .env file (edit ALLOWED_ORIGINS with your Mac's LAN IP if needed)${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
    # Ensure FIREBASE_SERVICE_ACCOUNT_PATH is set
    if ! grep -q "FIREBASE_SERVICE_ACCOUNT_PATH" .env; then
        echo "FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-service-account.json" >> .env
        echo -e "${GREEN}  ✓ Added FIREBASE_SERVICE_ACCOUNT_PATH to .env${NC}"
    fi
fi

# ─── 4. Get Mac's LAN IP ─────────────────────────────────────────────────────
echo -e "${YELLOW}[4/6] Detecting Mac LAN IP...${NC}"

MAC_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")

if [ "$MAC_IP" != "unknown" ]; then
    echo -e "${GREEN}✓ Mac LAN IP: ${MAC_IP}${NC}"
    echo ""
    echo -e "  ${BLUE}Update your iOS/Android app's API URL to: http://${MAC_IP}:8080${NC}"
    
    # Update ALLOWED_ORIGINS to include the LAN IP
    if ! grep -q "$MAC_IP" .env; then
        sed -i '' "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://${MAC_IP}:3000,http://${MAC_IP}:8080|" .env
        echo -e "  ${GREEN}✓ Updated ALLOWED_ORIGINS in .env with ${MAC_IP}${NC}"
    fi
else
    echo -e "${YELLOW}  Could not detect LAN IP. Make sure you're connected to WiFi.${NC}"
fi

# ─── 5. Expose ports for LAN access ─────────────────────────────────────────
echo -e "${YELLOW}[5/6] Updating docker-compose for LAN access...${NC}"

# Change 127.0.0.1 bindings to 0.0.0.0 so iOS/Android can reach the backend
if grep -q "127.0.0.1" docker-compose.yml; then
    # Create backup
    cp docker-compose.yml docker-compose.yml.bak
    sed -i '' 's/127\.0\.0\.1://g' docker-compose.yml
    echo -e "${GREEN}✓ Opened ports for LAN access (bound to 0.0.0.0)${NC}"
    echo -e "  ${YELLOW}(backup saved as docker-compose.yml.bak)${NC}"
else
    echo -e "${GREEN}✓ Ports already open for LAN${NC}"
fi

# ─── 6. Build and Start ──────────────────────────────────────────────────────
echo -e "${YELLOW}[6/6] Building and starting all services...${NC}"
echo ""

docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║              ✓ All services started!                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Status Check ────────────────────────────────────────────────────────────
echo -e "${BLUE}Service Status:${NC}"
docker compose ps

echo ""
echo -e "${BLUE}📡 Endpoints:${NC}"
echo -e "  Backend API  → http://localhost:8080"
echo -e "  Frontend     → http://localhost:3000"
if [ "$MAC_IP" != "unknown" ]; then
echo ""
echo -e "${BLUE}📱 Mobile App Config (same WiFi):${NC}"
echo -e "  API Base URL → http://${MAC_IP}:8080"
echo -e "  Update ApiClient.java (Android) and NetworkManager.swift (iOS)"
fi

echo ""
echo -e "${BLUE}🔔 Test push notifications:${NC}"
echo -e "  curl -s http://localhost:8080/api/hackathons | head -c 100"
echo ""
echo -e "${BLUE}📋 View backend logs:${NC}"
echo -e "  docker compose logs -f backend"
echo ""
