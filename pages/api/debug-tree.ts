import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { DEFAULT_TREE } from 'libs/shared/tree';

const connectionString = 'postgres://neondb_owner:npg_ThvUKjP3rxD4@ep-odd-river-a4gj35f2-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const startTime = Date.now();
    let step = 'Starting';
    
    try {
        console.log('Debug tree API called');
        
        step = 'Creating pool';
        const pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            max: 1,
            idleTimeoutMillis: 5000,
            connectionTimeoutMillis: 5000,
        });

        step = 'Getting connection';
        const client = await pool.connect();
        
        step = 'Creating tables';
        // Ensure tables exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS tree_data (
                id VARCHAR(255) PRIMARY KEY DEFAULT 'main',
                data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        step = 'Checking for existing tree';
        const result = await client.query(
            'SELECT data FROM tree_data WHERE id = $1',
            ['main']
        );

        let tree;
        if (result.rows.length === 0) {
            step = 'Inserting default tree';
            await client.query(`
                INSERT INTO tree_data (id, data, updated_at)
                VALUES ('main', $1, NOW())
            `, [JSON.stringify(DEFAULT_TREE)]);
            tree = DEFAULT_TREE;
        } else {
            step = 'Using existing tree';
            tree = result.rows[0].data;
        }

        step = 'Cleaning up';
        client.release();
        await pool.end();

        const duration = Date.now() - startTime;
        
        return res.status(200).json({
            status: 'success',
            tree,
            duration: `${duration}ms`,
            step: 'Completed',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Error at step "${step}":`, error);
        
        return res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            step,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
    }
}
