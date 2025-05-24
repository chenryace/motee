import { FC, useState, useEffect } from 'react';
import { Button } from '@material-ui/core';
import { DocumentIcon, UploadIcon } from '@heroicons/react/outline';
import EditorState from 'libs/web/state/editor';

interface SaveButtonProps {
    className?: string;
}

const SaveButton: FC<SaveButtonProps> = ({ className }) => {
    const { syncToServer } = EditorState.useContainer();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await syncToServer();
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

    return (
        <Button
            variant="contained"
            color="primary"
            startIcon={isSaving ? <UploadIcon className="w-4 h-4" /> : <DocumentIcon className="w-4 h-4" />}
            onClick={handleSave}
            disabled={isSaving}
            className={className}
            size="small"
        >
            {isSaving ? 'Saving...' : 'Save'}
        </Button>
    );
};

export default SaveButton;
