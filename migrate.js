import pg from 'pg'
const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_PUBLIC_URL || process.env.POSTGRES_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false, // Railway private network
  connectionTimeoutMillis: 10000,
})

const schema = `
-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_address TEXT NOT NULL,
  token_type TEXT NOT NULL UNIQUE,
  pool_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  
  -- Social links
  twitter TEXT,
  telegram TEXT,
  website TEXT,
  
  -- Agent configuration
  personality TEXT NOT NULL, -- Will become SOUL.md
  skills TEXT[] DEFAULT '{}', -- Array of skill names
  llm_model TEXT NOT NULL, -- 'minimax-m2.7' | 'claude-sonnet-4.5' | 'gpt-4'
  
  -- Revenue split (percentages)
  revenue_aida INTEGER DEFAULT 30,
  revenue_creator INTEGER DEFAULT 40,
  revenue_platform INTEGER DEFAULT 30,
  
  -- Runtime
  openclaw_session_id TEXT,
  status TEXT DEFAULT 'creating', -- 'creating' | 'active' | 'paused' | 'stopped'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_agents_creator ON agents(creator_address);
CREATE INDEX IF NOT EXISTS idx_agents_token_type ON agents(token_type);
CREATE INDEX IF NOT EXISTS idx_agents_pool_id ON agents(pool_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Agent earnings tracking
CREATE TABLE IF NOT EXISTS agent_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  trade_digest TEXT NOT NULL,
  trade_type TEXT NOT NULL, -- 'buy' | 'sell'
  sui_volume BIGINT NOT NULL, -- Volume in MIST
  creator_cut BIGINT NOT NULL, -- Creator's share in MIST
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_agent ON agent_earnings(agent_id);
CREATE INDEX IF NOT EXISTS idx_earnings_timestamp ON agent_earnings(timestamp DESC);

-- Agent chat messages (optional - for web dashboard)
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, -- 'user' | 'agent'
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_agent ON agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON agent_messages(timestamp DESC);
`

async function migrate() {
  console.log('🔄 Running migrations...')
  
  try {
    await pool.query(schema)
    console.log('✅ Migrations complete!')
    console.log('\nTables created:')
    console.log('  - agents')
    console.log('  - agent_earnings')
    console.log('  - agent_messages')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
