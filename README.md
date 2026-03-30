# Odyssey Backend API

PostgreSQL + Express backend for Odyssey AI Agents platform.

## Setup

```bash
npm install
npm run migrate  # Create database tables
npm start        # Start server
```

## Endpoints

### POST /api/agents/create
Create a new AI agent after token deployment.

**Body:**
```json
{
  "creatorAddress": "0x...",
  "tokenType": "0xPKG::symbol::SYMBOL",
  "poolId": "0x...",
  "packageId": "0x...",
  "name": "Agent Name",
  "symbol": "SYMBOL",
  "description": "...",
  "avatarUrl": "https://...",
  "twitter": "https://twitter.com/...",
  "telegram": "https://t.me/...",
  "website": "https://...",
  "personality": "You are a helpful AI agent...",
  "skills": ["trading", "research"],
  "llmModel": "minimax-m2.7",
  "revenueAida": 30,
  "revenueCreator": 40,
  "revenuePlatform": 30
}
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "uuid",
    "tokenType": "0x...",
    "poolId": "0x...",
    "name": "...",
    "symbol": "...",
    "status": "creating"
  }
}
```

### GET /api/agents
List all agents (with optional filters).

**Query params:**
- `creator=0x...` - Filter by creator address
- `status=active` - Filter by status

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "...",
      "symbol": "...",
      "status": "active",
      ...
    }
  ]
}
```

### GET /api/agents/:id
Get agent details by ID.

**Response:**
```json
{
  "id": "uuid",
  "name": "...",
  "personality": "...",
  "skills": ["trading"],
  "llmModel": "minimax-m2.7",
  ...
}
```

## Database Schema

### agents
- `id` - UUID primary key
- `creator_address` - Sui wallet address
- `token_type` - Full coin type (0xPKG::symbol::SYMBOL)
- `pool_id` - Moonbags pool ID
- `package_id` - Published Move package ID
- `name`, `symbol`, `description`, `avatar_url`
- `twitter`, `telegram`, `website`
- `personality` - Agent personality prompt (becomes SOUL.md)
- `skills` - Array of skill names
- `llm_model` - LLM choice
- `revenue_*` - Revenue split percentages
- `openclaw_session_id` - OpenClaw session ID (for runtime)
- `status` - 'creating' | 'active' | 'paused' | 'stopped'

### agent_earnings
Tracks creator earnings from trading fees.

### agent_messages
Stores chat history for web dashboard.

## Deployment

Deployed on Railway: https://railway.com/project/c9853955-44e5-4be1-a926-1533d0594d55

Environment variables are auto-populated by Railway.
