import NoteState from 'libs/web/state/note';
import { useRouter } from 'next/router';
import {
    useCallback,
    MouseEvent as ReactMouseEvent,
    useState,
    useRef,
} from 'react';
import { searchNote, searchRangeText } from 'libs/web/utils/search';
import useFetcher from 'libs/web/api/fetcher';
import { NOTE_DELETED } from 'libs/shared/meta';
import { isNoteLink, NoteModel } from 'libs/shared/note';
import { useToast } from 'libs/web/hooks/use-toast';
import PortalState from 'libs/web/state/portal';
import { NoteCacheItem } from 'libs/web/cache';
import noteCache from 'libs/web/cache/note';
import { createContainer } from 'unstated-next';
import MarkdownEditor from '@notea/rich-markdown-editor';

import { ROOT_ID } from 'libs/shared/tree';
import { has } from 'lodash';
import UIState from './ui';

const onSearchLink = async (keyword: string) => {
    const list = await searchNote(keyword, NOTE_DELETED.NORMAL);

    return list.map((item) => ({
        title: item.title,
        // todo 路径
        subtitle: searchRangeText({
            text: item.rawContent || '',
            keyword,
            maxLen: 40,
        }).match,
        url: `/${item.id}`,
    }));
};

const useEditor = (initNote?: NoteModel) => {
    // Use initNote if provided, otherwise try to get from NoteState
    let note = initNote;
    let createNoteWithTitle, updateNote, createNote;

    try {
        const noteState = NoteState.useContainer();
        createNoteWithTitle = noteState.createNoteWithTitle;
        updateNote = noteState.updateNote;
        createNote = noteState.createNote;

        // Only use noteState.note if no initNote is provided
        if (!note) {
            note = noteState.note;
        }
    } catch (error) {
        // If NoteState is not available, we'll work with just the initNote
        console.warn('NoteState not available in EditorState, using initNote only');
        createNoteWithTitle = async () => undefined;
        updateNote = async () => undefined;
        createNote = async () => undefined;
    }
    const {
        ua: { isBrowser },
    } = UIState.useContainer();
    const router = useRouter();
    const { request, error } = useFetcher();
    const toast = useToast();
    const editorEl = useRef<MarkdownEditor>(null);

    // Manual save function for IndexedDB
    const saveToIndexedDB = useCallback(
        async (data: Partial<NoteModel>) => {
            if (!note?.id) return;

            const updatedNote = { ...note, ...data };
            await noteCache.setItem(note.id, updatedNote);
        },
        [note]
    );

    // Manual sync to server (借鉴旧项目的核心逻辑)
    const syncToServer = useCallback(
        async () => {
            if (!note?.id) return false;

            const isNew = has(router.query, 'new');

            try {
                // 借鉴旧项目：优先使用IndexedDB中的最新数据
                const localNote = await noteCache.getItem(note.id);
                const noteToSave = localNote || note;

                if (isNew) {
                    // 借鉴旧项目：创建新笔记时包含完整数据
                    const noteData = {
                        ...noteToSave,
                        pid: (router.query.pid as string) || ROOT_ID
                    };

                    const item = await createNote(noteData);

                    if (item) {
                        // 借鉴旧项目：成功后移除?new参数
                        const noteUrl = `/${item.id}`;
                        if (router.asPath !== noteUrl) {
                            await router.replace(noteUrl, undefined, { shallow: true });
                        }
                        toast('Note saved to server', 'success');
                        return true;
                    }
                } else {
                    // 借鉴旧项目：更新现有笔记
                    const updatedNote = await updateNote(noteToSave);

                    if (updatedNote) {
                        // 借鉴旧项目：用服务器响应更新本地缓存
                        await noteCache.setItem(updatedNote.id, updatedNote);
                        toast('Note updated on server', 'success');
                        return true;
                    }
                }

                return false;
            } catch (error) {
                toast('Failed to sync to server. Changes saved locally.', 'warning');
                return false;
            }
        },
        [note, router, createNote, updateNote, toast]
    );

    const onCreateLink = useCallback(
        async (title: string) => {
            const result = await createNoteWithTitle(title);

            if (!result) {
                throw new Error('todo');
            }

            return `/${result.id}`;
        },
        [createNoteWithTitle]
    );

    const onClickLink = useCallback(
        (href: string) => {
            if (isNoteLink(href.replace(location.origin, ''))) {
                router.push(href, undefined, { shallow: true })
                    .catch((v) => console.error('Error whilst pushing href to router: %O', v));
            } else {
                window.open(href, '_blank');
            }
        },
        [router]
    );

    const onUploadImage = useCallback(
        async (file: File, id?: string) => {
            // Image upload is disabled in PostgreSQL version
            toast('Image upload is not supported in this version', 'error');
            throw new Error('Image upload is not supported');
        },
        [toast]
    );

    const { preview, linkToolbar } = PortalState.useContainer();

    const onHoverLink = useCallback(
        (event: MouseEvent | ReactMouseEvent) => {
            if (!isBrowser || editorEl.current?.props.readOnly) {
                return true;
            }
            const link = event.target as HTMLLinkElement;
            const href = link.getAttribute('href');
            if (link.classList.contains('bookmark')) {
                return true;
            }
            if (href) {
                if (isNoteLink(href)) {
                    preview.close();
                    preview.setData({ id: href.slice(1) });
                    preview.setAnchor(link);
                } else {
                    linkToolbar.setData({ href, view: editorEl.current?.view });
                    linkToolbar.setAnchor(link);
                }
            } else {
                preview.setData({ id: undefined });
            }
            return true;
        },
        [isBrowser, preview, linkToolbar]
    );

    const [backlinks, setBackLinks] = useState<NoteCacheItem[]>();

    const getBackLinks = useCallback(async () => {
        console.log(note?.id);
        const linkNotes: NoteCacheItem[] = [];
        if (!note?.id) return linkNotes;
        setBackLinks([]);
        await noteCache.iterate<NoteCacheItem, void>((value) => {
            if (value.linkIds?.includes(note.id)) {
                linkNotes.push(value);
            }
        });
        setBackLinks(linkNotes);
    }, [note?.id]);

    const onEditorChange = useCallback(
        (value: () => string): void => {
            const content = value();

            // Extract title from content (first line)
            const lines = content.split('\n');
            const title = lines[0]?.replace(/^#\s*/, '') || 'Untitled';

            // Save to IndexedDB immediately for local persistence
            saveToIndexedDB({
                content,
                title,
                updated_at: new Date().toISOString()
            })?.catch((v) => console.error('Error whilst saving to IndexedDB: %O', v));
        },
        [saveToIndexedDB]
    );

    // Function to handle title changes specifically
    const onTitleChange = useCallback(
        (title: string): void => {
            saveToIndexedDB({
                title,
                updated_at: new Date().toISOString()
            })?.catch((v) => console.error('Error whilst saving title to IndexedDB: %O', v));
        },
        [saveToIndexedDB]
    );

    return {
        onCreateLink,
        onSearchLink,
        onClickLink,
        onUploadImage,
        onHoverLink,
        getBackLinks,
        onEditorChange,
        onTitleChange,
        saveToIndexedDB,
        syncToServer,
        backlinks,
        editorEl,
        note,
    };
};

const EditorState = createContainer(useEditor);

export default EditorState;
