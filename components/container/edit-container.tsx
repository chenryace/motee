import NoteState from 'libs/web/state/note';
import { has } from 'lodash';
import { useRouter } from 'next/router';
import { useCallback, useEffect } from 'react';
import NoteTreeState from 'libs/web/state/tree';
import NoteNav from 'components/note-nav';
import UIState from 'libs/web/state/ui';
import noteCache from 'libs/web/cache/note';
import useSettingsAPI from 'libs/web/api/settings';
import dynamic from 'next/dynamic';
import { useToast } from 'libs/web/hooks/use-toast';
import DeleteAlert from 'components/editor/delete-alert';
import EditorState from 'libs/web/state/editor';

const MainEditor = dynamic(() => import('components/editor/main-editor'));

export const EditContainer = () => {
    const {
        title: { updateTitle },
        settings: { settings },
    } = UIState.useContainer();
    const { genNewId } = NoteTreeState.useContainer();
    const { fetchNote, abortFindNote, findOrCreateNote, initNote, note } =
        NoteState.useContainer();
    const router = useRouter();
    const { query } = router;
    const pid = query.pid as string;
    const id = query.id as string;
    const isNew = has(query, 'new');
    const { mutate: mutateSettings } = useSettingsAPI();
    const toast = useToast();

    const loadNoteById = useCallback(
        async (id: string) => {
            // daily notes - 使用initNote创建，ID由系统生成，标题为日期
            if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(id)) {
                // 先检查是否已存在以该日期为标题的笔记
                try {
                    const existingNote = await fetchNote(id);
                    if (existingNote) {
                        // 已存在，直接使用
                        return;
                    }
                } catch (e) {
                    // 不存在，创建新的每日笔记
                    // 生成新ID，但标题使用日期
                    const newId = genNewId();

                    // 重定向到新ID，但保持每日笔记的特性
                    await router.replace(`/${newId}?new&daily=${id}`, undefined, { shallow: true });
                    return;
                }
            } else if (id === 'new') {
                const url = `/${genNewId()}?new` + (pid ? `&pid=${pid}` : '');

                await router.replace(url, undefined, { shallow: true });
            } else if (id && !isNew) {
                try {
                    const result = await fetchNote(id);
                    if (!result) {
                        await router.replace({ query: { ...router.query, new: 1 } });
                        return;
                    }
                } catch (msg) {
                    const err = msg as Error;
                    if (err.name !== 'AbortError') {
                        toast(err.message, 'error');
                        await router.push('/', undefined, { shallow: true });
                    }
                }
            } else {
                // 检查是否是每日笔记（通过daily参数）
                const dailyDate = router.query.daily as string;

                if (dailyDate && /^\d{4}-\d{1,2}-\d{1,2}$/.test(dailyDate)) {
                    // 这是每日笔记，使用日期作为标题
                    initNote({
                        id,
                        title: dailyDate,
                        content: '\n',
                        pid: settings.daily_root_id,
                    });
                } else {
                    // 普通新笔记逻辑
                    const cachedNote = await noteCache.getItem(id);
                    if (cachedNote) {
                        initNote(cachedNote);
                        return;
                    }

                    // 借鉴旧项目：直接初始化本地笔记，简单有效
                    initNote({
                        id,
                        title: '',
                        content: '\n',
                        pid: pid || 'root'
                    });
                }
            }

            if (!isNew && id !== 'new') {
                await mutateSettings({
                    last_visit: `/${id}`,
                });
            }
        },
        [
            isNew,
            findOrCreateNote,
            settings.daily_root_id,
            genNewId,
            pid,
            fetchNote,
            toast,
            initNote,
            mutateSettings,
            router,
        ]
    );

    useEffect(() => {
        abortFindNote();
        loadNoteById(id)
            ?.catch((v) => console.error('Could not load note: %O', v));
    }, [loadNoteById, abortFindNote, id]);

    useEffect(() => {
        updateTitle(note?.title);
    }, [note?.title, updateTitle]);

    return (
        <EditorState.Provider initialState={note}>
            <NoteNav />
            <DeleteAlert />
            <section className="h-full">
                <MainEditor note={note} />
            </section>
        </EditorState.Provider>
    );
};
