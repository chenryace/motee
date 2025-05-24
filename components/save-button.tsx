import { FC, useState } from 'react';
import { Button } from '@material-ui/core';
import { Save as SaveIcon, CloudUpload as CloudUploadIcon } from '@heroicons/react/outline';
import EditorState from 'libs/web/state/editor';
import { useHotkeys } from 'react-hotkeys-hook';

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
    useHotkeys('ctrl+s,cmd+s', (e) => {
        e.preventDefault();
        handleSave();
    }, { enableOnTags: ['INPUT', 'TEXTAREA'] });

    return (
        <Button
            variant="contained"
            color="primary"
            startIcon={isSaving ? <CloudUploadIcon className="w-4 h-4" /> : <SaveIcon className="w-4 h-4" />}
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
