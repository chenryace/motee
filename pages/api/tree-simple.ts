import { NextApiRequest, NextApiResponse } from 'next';
import { TreeStorePostgreSQL } from 'libs/server/store/tree-postgresql';
import { DEFAULT_TREE } from 'libs/shared/tree';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const startTime = Date.now();
    
    try {
        const connectionString = process.env.DATABASE_URL;
        
        if (!connectionString) {
            return res.status(500).json({ 
                error: 'DATABASE_URL not configured',
                status: 'error'
            });
        }

        console.log('Creating TreeStore...');
        const treeStore = new TreeStorePostgreSQL({
            connectionString
        });

        console.log('Getting tree...');
        
        // Add timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 8 seconds')), 8000)
        );
        
        const tree = await Promise.race([
            treeStore.get(),
            timeoutPromise
        ]);
        
        console.log('Tree retrieved, closing connection...');
        await treeStore.close();
        
        const duration = Date.now() - startTime;
        
        return res.status(200).json({
            status: 'success',
            tree: tree || DEFAULT_TREE,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Tree simple test failed:', error);
        
        return res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
    }
}
