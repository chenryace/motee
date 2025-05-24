import { Pool } from 'pg';
import { createLogger } from 'libs/server/debugging';
import { TreeModel, DEFAULT_TREE, ROOT_ID } from 'libs/shared/tree';

export interface TreeStoreConfig {
    connectionString: string;
}

export class TreeStorePostgreSQL {
    private pool: Pool;
    private logger = createLogger('tree-store.postgresql');

    constructor(config: TreeStoreConfig) {
        this.pool = new Pool({
            connectionString: config.connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 1, // Vercel serverless functions work better with fewer connections
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000,
        });
    }

    async getTree(): Promise<TreeModel> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT data FROM tree_data WHERE id = $1',
                ['main']
            );

            if (result.rows.length === 0) {
                // Return default tree if none exists
                return DEFAULT_TREE;
            }

            return result.rows[0].data as TreeModel;
        } catch (error) {
            this.logger.error('Error getting tree:', error);
            return DEFAULT_TREE;
        } finally {
            client.release();
        }
    }

    async putTree(tree: TreeModel): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(`
                INSERT INTO tree_data (id, data, updated_at)
                VALUES ('main', $1, NOW())
                ON CONFLICT (id)
                DO UPDATE SET
                    data = EXCLUDED.data,
                    updated_at = NOW()
            `, [JSON.stringify(tree)]);

            this.logger.debug('Successfully updated tree data');
        } catch (error) {
            this.logger.error('Error updating tree:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async addItem(id: string, parentId: string = ROOT_ID): Promise<void> {
        const tree = await this.getTree();

        // Add item to tree structure
        if (!tree.items[id]) {
            tree.items[id] = {
                id,
                children: [],
            };
        }

        // Add to parent's children if not already there
        if (tree.items[parentId] && !tree.items[parentId].children.includes(id)) {
            tree.items[parentId].children.push(id);
        }

        await this.putTree(tree);
        this.logger.debug('Added item to tree:', id, 'parent:', parentId);
    }

    async removeItem(id: string): Promise<void> {
        const tree = await this.getTree();

        // Remove from all parent children arrays
        Object.values(tree.items).forEach(item => {
            const index = item.children.indexOf(id);
            if (index > -1) {
                item.children.splice(index, 1);
            }
        });

        // Remove the item itself
        delete tree.items[id];

        await this.putTree(tree);
        this.logger.debug('Removed item from tree:', id);
    }

    async moveItem(id: string, newParentId: string, index?: number): Promise<void> {
        const tree = await this.getTree();

        // Remove from current parent
        Object.values(tree.items).forEach(item => {
            const currentIndex = item.children.indexOf(id);
            if (currentIndex > -1) {
                item.children.splice(currentIndex, 1);
            }
        });

        // Add to new parent
        if (tree.items[newParentId]) {
            if (typeof index === 'number') {
                tree.items[newParentId].children.splice(index, 0, id);
            } else {
                tree.items[newParentId].children.push(id);
            }
        }

        await this.putTree(tree);
        this.logger.debug('Moved item in tree:', id, 'to parent:', newParentId, 'at index:', index);
    }

    async deleteItem(id: string): Promise<void> {
        const tree = await this.getTree();

        // Recursively collect all children to delete
        const toDelete = new Set<string>();
        const collectChildren = (itemId: string) => {
            toDelete.add(itemId);
            if (tree.items[itemId]) {
                tree.items[itemId].children.forEach(childId => {
                    collectChildren(childId);
                });
            }
        };

        collectChildren(id);

        // Remove all collected items
        toDelete.forEach(itemId => {
            // Remove from parent children arrays
            Object.values(tree.items).forEach(item => {
                const index = item.children.indexOf(itemId);
                if (index > -1) {
                    item.children.splice(index, 1);
                }
            });

            // Remove the item itself
            delete tree.items[itemId];
        });

        await this.putTree(tree);
        this.logger.debug('Deleted item and children from tree:', Array.from(toDelete));
    }

    async restoreItem(id: string, parentId: string = ROOT_ID): Promise<void> {
        // This is the same as addItem for our purposes
        await this.addItem(id, parentId);
        this.logger.debug('Restored item to tree:', id, 'parent:', parentId);
    }

    async updateItemData(id: string, data: any): Promise<void> {
        const tree = await this.getTree();

        if (tree.items[id]) {
            tree.items[id].data = data;
            await this.putTree(tree);
            this.logger.debug('Updated item data in tree:', id);
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
