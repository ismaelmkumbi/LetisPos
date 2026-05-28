# Business Identity Engine — Deployment Guide

## What was built (61 files)
- Design token system (CSS variables `--bp-*`, light/dark mode)
- Receipt & email branding
- 12 industry preset marketplace
- Brand inheritance + franchise locking
- Custom domain white-label support
- AI brand kit generator, health scoring, copy generator
- AI onboarding wizard (5-step setup)
- Enterprise approval workflow + audit log
- Multi-surface live preview panel
- WCAG contrast checker
- Kimi AI provider added
- 9 new DB migrations (V20–V28)

## Prerequisites
- OpenAI API key for image generation
- Latest code on all servers (`git pull origin main`)

---

## Server A (109.199.122.118) — Main Docker host

### 1. Pull latest code
```bash
cd ~/LetisPos
git pull origin main
```

### 2. Rebuild sales-service (has DB migrations + new branding endpoints)
```bash
cd ~/LetisPos/backend/sales-service
docker build -t letispos-sales-service .
# Or if using docker-compose:
docker compose -f ~/LetisPos/ops/production/server-a/docker-compose.yml build sales-service
```

### 3. Restart services with DB migration
```bash
docker compose -f ~/LetisPos/ops/production/server-a/docker-compose.yml up -d sales-service
# Check logs for migration success
docker logs letispos-sales-service 2>&1 | grep -i "migrate\|V20\|V21\|V22\|error"
```

### 4. Rebuild frontend (has SVG fallback + all new components)
```bash
cd ~/LetisPos/frontend
npm run build
# Restart frontend container
docker compose -f ~/LetisPos/ops/production/server-a/docker-compose.yml restart frontend
```

### 5. Verify
```bash
# DB migrations ran
curl -s https://api.letispos.com/actuator/health

# Brand endpoints work
curl -s https://api.letispos.com/api/v1/brand/profile \
  -H "Authorization: Bearer <token>"

# Presets accessible
curl -s https://api.letispos.com/api/v1/brand/presets \
  -H "Authorization: Bearer <token>"
```

---

## Server B (10.0.0.2 / 161.97.181.166) — AI Service

### 1. Pull latest code
```bash
cd ~/LetisPos
git pull origin main
```

### 2. Set OpenAI key
```bash
export OPENAI_API_KEY=sk-your-openai-key-here
export OPENAI_IMAGE_MODEL=gpt-image-1
```

### 3. Rebuild and restart
```bash
cd ~/LetisPos/backend/ai-service
mvn clean package -DskipTests
sudo systemctl restart ai-service
```

### 4. Verify
```bash
# Health check
curl -s http://localhost:8091/actuator/health

# AI chat works
curl -s -X POST http://localhost:8091/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello","systemPrompt":"You are helpful"}'

# Logo generation works
curl -s -X POST http://localhost:8091/api/v1/ai/brand/logo-image \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Test Corp","count":1}'
```

---

## Post-Deployment Verification Checklist

- [ ] Brand Identity page loads at `/settings/brand`
- [ ] Preset marketplace shows 12 industry presets
- [ ] "AI Brand Setup Wizard" walks through 5 steps
- [ ] "Generate AI logo" button produces an image
- [ ] Brand Advisor chat responds to questions
- [ ] Changing colors updates the live preview instantly
- [ ] Approval status shows "Published"
- [ ] Health score card shows a grade
- [ ] Custom domain section visible
- [ ] Campaign section visible

## Common Issues

| Issue | Fix |
|-------|-----|
| 502 on `/api/v1/brand/ai/logo-image` | AI service not running on 10.0.0.2:8091. Check `systemctl status ai-service` |
| 500 "No static resource" on ai-service | AI service running old code. Rebuild from latest commit |
| 500 "locked_fields is of type jsonb" | DB migration V24 didn't run. Check Flyway logs |
| 500 on `/profile/reset` | Same as above — missing migration |
| Empty images response | OPENAI_API_KEY not set or invalid. Check ai-service env |
| SVG logo looks plain | Expected fallback when AI unavailable — still a usable logo |
