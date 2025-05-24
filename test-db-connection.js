const { Pool } = require('pg');

const connectionString = 'postgres://neondb_owner:npg_ThvUKjP3rxD4@ep-odd-river-a4gj35f2-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function testConnection() {
    console.log('Testing database connection...');
    
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 1,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
    });

    try {
        console.log('1. Testing basic connection...');
        const client = await pool.connect();
        console.log('✅ Connected successfully');

        console.log('2. Testing simple query...');
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ Simple query successful:', result.rows[0].current_time);

        console.log('3. Checking if tables exist...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('notes', 'tree_data')
        `);
        console.log('📋 Existing tables:', tablesResult.rows.map(r => r.table_name));

        console.log('4. Creating tables if they don\'t exist...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id VARCHAR(255) PRIMARY KEY,
                path VARCHAR(500) UNIQUE NOT NULL,
                content TEXT,
                content_type VARCHAR(100) DEFAULT 'text/markdown',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS tree_data (
                id VARCHAR(255) PRIMARY KEY DEFAULT 'main',
                data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('✅ Tables created/verified');

        console.log('5. Testing tree data operations...');
        const defaultTree = {
            items: {
                'root': {
                    id: 'root',
                    children: []
                }
            }
        };

        // Insert or update tree data
        await client.query(`
            INSERT INTO tree_data (id, data, updated_at)
            VALUES ('main', $1, NOW())
            ON CONFLICT (id) 
            DO UPDATE SET 
                data = EXCLUDED.data,
                updated_at = NOW()
        `, [JSON.stringify(defaultTree)]);
        console.log('✅ Tree data inserted/updated');

        // Read tree data
        const treeResult = await client.query('SELECT data FROM tree_data WHERE id = $1', ['main']);
        console.log('✅ Tree data retrieved:', JSON.stringify(treeResult.rows[0].data, null, 2));

        client.release();
        await pool.end();
        
        console.log('🎉 All tests passed! Database is working correctly.');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        try {
            await pool.end();
        } catch (closeError) {
            console.error('Error closing pool:', closeError);
        }
    }
}

testConnection();
