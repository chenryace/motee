import { Tooltip, TooltipProps } from '@material-ui/core';
import UIState from 'libs/web/state/ui';
import { noop } from 'lodash';
import { FC, useEffect } from 'react';
import type { ReactNodeLike } from 'prop-types';

const Title: FC<{
    text: string;
    keys: string[];
}> = ({ text, keys }) => {
    return (
        <span>
            {text} {keys.join('+')}
        </span>
    );
};

const HotkeyTooltip: FC<{
    text: string;
    keys?: string[];
    children: ReactNodeLike;
    /**
     * first key
     */
    commandKey?: boolean;
    optionKey?: boolean;
    onClose?: TooltipProps['onClose'];
    onHotkey?: () => void;
    disableOnContentEditable?: boolean;
}> = ({
    text,
    keys = [],
    children,
    onClose,
    commandKey,
    optionKey,
    onHotkey = noop,
    disableOnContentEditable = false,
}) => {
    const {
        ua: { isMac },
    } = UIState.useContainer();
    const keyMap = [...keys];

    if (commandKey) {
        keyMap.unshift(isMac ? '⌘' : 'ctrl');
    }

    if (optionKey) {
        keyMap.unshift(isMac ? '⌥' : 'alt');
    }

    // Use native keyboard event handling
    useEffect(() => {
        if (!keys.length) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isInputElement = ['INPUT', 'TEXTAREA'].includes(target.tagName);
            const isContentEditable = target.isContentEditable;

            // Check if we should handle this event
            if (!isInputElement && (!isContentEditable || disableOnContentEditable)) {
                return;
            }

            // Build the key combination
            const pressedKeys: string[] = [];
            if (commandKey && (event.ctrlKey || event.metaKey)) {
                pressedKeys.push(isMac ? '⌘' : 'ctrl');
            }
            if (optionKey && event.altKey) {
                pressedKeys.push(isMac ? '⌥' : 'alt');
            }
            pressedKeys.push(...keys);

            // Check if the pressed combination matches
            const expectedCombo = keyMap.join('+').toLowerCase();
            const actualCombo = pressedKeys.join('+').toLowerCase();

            if (actualCombo === expectedCombo) {
                event.preventDefault();
                onHotkey();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [keys, commandKey, optionKey, onHotkey, disableOnContentEditable, isMac, keyMap]);

    return (
        <Tooltip
            enterDelay={200}
            TransitionProps={{ timeout: 0 }}
            title={<Title text={text} keys={keyMap} />}
            onClose={onClose}
            placement="bottom-start"
        >
            {children as any}
        </Tooltip>
    );
};

export default HotkeyTooltip;
