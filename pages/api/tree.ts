import { api } from 'libs/server/connect';
import { useAuth } from 'libs/server/middlewares/auth';
import { useStore } from 'libs/server/middlewares/store';
import TreeActions from 'libs/shared/tree';

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        )
    ]);
}

export default api()
    .use(useAuth)
    .use(useStore)
    .get(async (req, res) => {
        try {
            console.log('Getting tree data...');

            // Add 8 second timeout (leaving 2 seconds buffer for Vercel's 10s limit)
            const tree = await withTimeout(
                req.state.treeStore.get(),
                8000
            );

            console.log('Tree data retrieved, cleaning...');
            const cleanedTree = TreeActions.cleanTreeModel(tree);

            const style = req.query['style'];
            switch (style) {
                case 'hierarchy':
                    res.json(TreeActions.makeHierarchy(cleanedTree));
                    break;
                case 'list':
                default:
                    res.json(cleanedTree);
                    break;
            }
        } catch (error) {
            console.error('Error in GET /api/tree:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get tree',
                timestamp: new Date().toISOString()
            });
        }
    })
    .post(async (req, res) => {
        try {
            const { action, data } = req.body as {
                action: 'move' | 'mutate';
                data: any;
            };

            console.log('Tree action:', action, 'data:', data);

            switch (action) {
                case 'move':
                    await withTimeout(
                        req.state.treeStore.moveItem(data.source, data.destination),
                        8000
                    );
                    break;

                case 'mutate':
                    await withTimeout(
                        req.state.treeStore.mutateItem(data.id, data),
                        8000
                    );
                    break;

                default:
                    return res.APIError.NOT_SUPPORTED.throw('action not found');
            }

            res.status(204).end();
        } catch (error) {
            console.error('Error in POST /api/tree:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to update tree',
                timestamp: new Date().toISOString()
            });
        }
    });
