import express from 'express'
import cors from 'cors'
import pg from 'pg'
const { Pool } = pg

const app = express()
const PORT = process.env.PORT || 3000

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL not set')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============================================
// AGENT CREATION
// ============================================

app.post('/api/agents/create', async (req, res) => {
  try {
    const {
      creatorAddress,
      tokenType,
      poolId,
      packageId,
      name,
      symbol,
      description,
      avatarUrl,
      twitter,
      telegram,
      website,
      personality,
      skills,
      llmModel,
      revenueAida,
      revenueCreator,
      revenuePlatform,
    } = req.body

    // Validation
    if (!creatorAddress || !tokenType || !poolId || !packageId || !name || !symbol || !personality || !llmModel) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['creatorAddress', 'tokenType', 'poolId', 'packageId', 'name', 'symbol', 'personality', 'llmModel']
      })
    }

    // Check if agent already exists
    const existing = await pool.query(
      'SELECT id FROM agents WHERE token_type = $1',
      [tokenType]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Agent already exists for this token' })
    }

    // Insert agent
    const result = await pool.query(
      `INSERT INTO agents (
        creator_address, token_type, pool_id, package_id,
        name, symbol, description, avatar_url,
        twitter, telegram, website,
        personality, skills, llm_model,
        revenue_aida, revenue_creator, revenue_platform,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        creatorAddress, tokenType, poolId, packageId,
        name, symbol, description, avatarUrl,
        twitter, telegram, website,
        personality, skills || [], llmModel,
        revenueAida || 30, revenueCreator || 40, revenuePlatform || 30,
        'creating'
      ]
    )

    const agent = result.rows[0]

    // TODO: Spawn OpenClaw session
    // const sessionId = await spawnOpenClawSession(agent)
    // await pool.query('UPDATE agents SET openclaw_session_id = $1, status = $2 WHERE id = $3', [sessionId, 'active', agent.id])

    res.status(201).json({ 
      success: true, 
      agent: {
        id: agent.id,
        tokenType: agent.token_type,
        poolId: agent.pool_id,
        name: agent.name,
        symbol: agent.symbol,
        status: agent.status,
      }
    })
  } catch (error) {
    console.error('Agent creation error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// AGENT LISTING
// ============================================

app.get('/api/agents', async (req, res) => {
  try {
    const { creator, status } = req.query
    
    let query = 'SELECT * FROM agents'
    const params = []
    const conditions = []

    if (creator) {
      conditions.push(`creator_address = $${params.length + 1}`)
      params.push(creator)
    }

    if (status) {
      conditions.push(`status = $${params.length + 1}`)
      params.push(status)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    
    res.json({ 
      agents: result.rows.map(agent => ({
        id: agent.id,
        creatorAddress: agent.creator_address,
        tokenType: agent.token_type,
        poolId: agent.pool_id,
        name: agent.name,
        symbol: agent.symbol,
        description: agent.description,
        avatarUrl: agent.avatar_url,
        llmModel: agent.llm_model,
        status: agent.status,
        createdAt: agent.created_at,
      }))
    })
  } catch (error) {
    console.error('Agent listing error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// AGENT DETAILS
// ============================================

app.get('/api/agents/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'SELECT * FROM agents WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const agent = result.rows[0]

    res.json({
      id: agent.id,
      creatorAddress: agent.creator_address,
      tokenType: agent.token_type,
      poolId: agent.pool_id,
      packageId: agent.package_id,
      name: agent.name,
      symbol: agent.symbol,
      description: agent.description,
      avatarUrl: agent.avatar_url,
      twitter: agent.twitter,
      telegram: agent.telegram,
      website: agent.website,
      personality: agent.personality,
      skills: agent.skills,
      llmModel: agent.llm_model,
      revenueAida: agent.revenue_aida,
      revenueCreator: agent.revenue_creator,
      revenuePlatform: agent.revenue_platform,
      openclawSessionId: agent.openclaw_session_id,
      status: agent.status,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    })
  } catch (error) {
    console.error('Agent details error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Odyssey Backend running on port ${PORT}`)
  console.log(`📊 Database: ${DATABASE_URL.split('@')[1]}`)
})
