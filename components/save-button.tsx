import { FC, useState, useEffect } from 'react';
import { Button, Chip } from '@material-ui/core';
import { DocumentIcon, UploadIcon, CheckIcon, ExclamationIcon } from '@heroicons/react/outline';
import EditorState from 'libs/web/state/editor';
import noteCache from 'libs/web/cache/note';
import { useRouter } from 'next/router';
import { has } from 'lodash';

interface SaveButtonProps {
    className?: string;
}

type SyncStatus = 'synced' | 'local' | 'syncing' | 'error';

const SaveButton: FC<SaveButtonProps> = ({ className }) => {
    const { syncToServer, note } = EditorState.useContainer();
    const [isSaving, setIsSaving] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const router = useRouter();

    // Check sync status (借鉴旧项目的简单有效逻辑)
    useEffect(() => {
        const checkSyncStatus = async () => {
            if (!note?.id) {
                setSyncStatus('synced');
                return;
            }

            const isNew = has(router.query, 'new');
            if (isNew) {
                setSyncStatus('local');
                return;
            }

            try {
                // 借鉴旧项目：检查本地缓存是否有更新
                const localNote = await noteCache.getItem(note.id);

                if (!localNote) {
                    setSyncStatus('synced');
                    if (note.updated_at) {
                        setLastSyncTime(new Date(note.updated_at));
                    }
                    return;
                }

                // 简单比较：如果有本地缓存且时间戳更新，说明有本地更改
                if (localNote.updated_at && note.updated_at) {
                    const localTime = new Date(localNote.updated_at);
                    const serverTime = new Date(note.updated_at);

                    if (localTime > serverTime) {
                        setSyncStatus('local');
                    } else {
                        setSyncStatus('synced');
                        setLastSyncTime(serverTime);
                    }
                } else {
                    setSyncStatus('local');
                }
            } catch (error) {
                setSyncStatus('error');
            }
        };

        checkSyncStatus();
    }, [note, router.query]);

    const handleSave = async () => {
        setIsSaving(true);
        setSyncStatus('syncing');

        try {
            const success = await syncToServer();
            if (success) {
                setSyncStatus('synced');
                setLastSyncTime(new Date());
            } else {
                setSyncStatus('error');
            }
        } catch (error) {
            setSyncStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // Add keyboard shortcut Ctrl+S / Cmd+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    const getButtonIcon = () => {
        switch (syncStatus) {
            case 'syncing':
                return <UploadIcon className="w-4 h-4 animate-pulse" />;
            case 'synced':
                return <CheckIcon className="w-4 h-4 text-green-500" />;
            case 'error':
                return <ExclamationIcon className="w-4 h-4 text-red-500" />;
            case 'local':
            default:
                return <DocumentIcon className="w-4 h-4" />;
        }
    };

    const getButtonText = () => {
        switch (syncStatus) {
            case 'syncing':
                return 'Syncing...';
            case 'synced':
                return 'Synced';
            case 'error':
                return 'Retry';
            case 'local':
                return 'Save to Server';
            default:
                return 'Save';
        }
    };

    const getStatusColor = () => {
        switch (syncStatus) {
            case 'synced':
                return 'primary';
            case 'local':
                return 'secondary';
            case 'error':
                return 'secondary';
            default:
                return 'primary';
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="contained"
                color={getStatusColor()}
                startIcon={getButtonIcon()}
                onClick={handleSave}
                disabled={isSaving}
                className={className}
                size="small"
            >
                {getButtonText()}
            </Button>

            {/* Status indicator */}
            {syncStatus === 'local' && (
                <Chip
                    size="small"
                    label="Local changes"
                    color="secondary"
                    variant="outlined"
                />
            )}

            {lastSyncTime && syncStatus === 'synced' && (
                <span className="text-xs text-gray-500">
                    Last saved: {lastSyncTime.toLocaleTimeString()}
                </span>
            )}
        </div>
    );
};

export default SaveButton;
