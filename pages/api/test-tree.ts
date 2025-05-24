import { NextApiRequest, NextApiResponse } from 'next';
import { TreeStorePostgreSQL } from 'libs/server/store/tree-postgresql';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const connectionString = process.env.DATABASE_URL;
        
        if (!connectionString) {
            return res.status(500).json({ 
                error: 'DATABASE_URL not configured',
                status: 'error'
            });
        }

        // Test TreeStore functionality
        const treeStore = new TreeStorePostgreSQL({
            connectionString
        });

        // Test get method
        const tree = await treeStore.get();
        
        await treeStore.close();
        
        return res.status(200).json({
            status: 'success',
            message: 'TreeStore methods working correctly',
            treeItemsCount: Object.keys(tree.items).length,
            hasGetMethod: typeof treeStore.get === 'function',
            hasMutateMethod: typeof treeStore.mutateItem === 'function',
            hasMoveMethod: typeof treeStore.moveItem === 'function',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('TreeStore test failed:', error);
        
        return res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
}
