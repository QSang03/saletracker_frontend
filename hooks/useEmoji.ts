import { useState, useEffect, useCallback, useMemo } from 'react';
import { EmojiHelper, createEmojiHelper, defaultEmojiConfig } from '@/lib/emoji-helper';
import { EmojiConfig, EmojiInfo } from '@/types/emoji';

interface UseEmojiOptions {
    config?: Partial<EmojiConfig>;
    dataPath?: string;
    autoLoad?: boolean;
}

interface UseEmojiReturn {
    emojiHelper: EmojiHelper | null;
    isLoading: boolean;
    error: string | null;
    getEmojiInfo: (shortcode: string) => EmojiInfo | null;
    parseText: (text: string) => string;
    searchEmojis: (query: string) => EmojiInfo[];
    getSpriteStyle: (shortcode: string) => React.CSSProperties | null;
    hasEmoji: (shortcode: string) => boolean;
    getAllShortcodes: () => string[];
    reload: () => Promise<void>;
}

export function useEmoji(options: UseEmojiOptions = {}): UseEmojiReturn {
    const {
        config = {},
        dataPath = '/emoji',
        autoLoad = true
    } = options;

    const [emojiHelper, setEmojiHelper] = useState<EmojiHelper | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Merge default config với user config
    const finalConfig = useMemo(() => ({
        ...defaultEmojiConfig,
        ...config
    }), [config]);

    // Load emoji helper
    const loadEmojiHelper = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const helper = await createEmojiHelper(finalConfig, dataPath);
            setEmojiHelper(helper);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load emoji data';
            setError(errorMessage);
            console.error('Error loading emoji helper:', err);
        } finally {
            setIsLoading(false);
        }
    }, [finalConfig, dataPath]);

    // Auto load on mount
    useEffect(() => {
        if (autoLoad) {
            loadEmojiHelper();
        }
    }, [autoLoad, loadEmojiHelper]);

    // Memoized helper methods
    const getEmojiInfo = useCallback((shortcode: string): EmojiInfo | null => {
        return emojiHelper?.getEmojiInfo(shortcode) || null;
    }, [emojiHelper]);

    const parseText = useCallback((text: string): string => {
        return emojiHelper?.parseText(text) || text;
    }, [emojiHelper]);

    const searchEmojis = useCallback((query: string): EmojiInfo[] => {
        return emojiHelper?.searchEmojis(query) || [];
    }, [emojiHelper]);

    const getSpriteStyle = useCallback((shortcode: string): React.CSSProperties | null => {
        return emojiHelper?.getEmojiStyle(shortcode) || null;
    }, [emojiHelper]);

    const hasEmoji = useCallback((shortcode: string): boolean => {
        return emojiHelper?.hasEmoji(shortcode) || false;
    }, [emojiHelper]);

    const getAllShortcodes = useCallback((): string[] => {
        return emojiHelper?.getAllShortcodes() || [];
    }, [emojiHelper]);

    const reload = useCallback(async (): Promise<void> => {
        await loadEmojiHelper();
    }, [loadEmojiHelper]);

    return {
        emojiHelper,
        isLoading,
        error,
        getEmojiInfo,
        parseText,
        searchEmojis,
        getSpriteStyle,
        hasEmoji,
        getAllShortcodes,
        reload
    };
}

// Hook cho việc sử dụng emoji với context (nếu cần)
export function useEmojiWithFallback(shortcode: string, fallback?: string): {
    emoji: string | null;
    isLoading: boolean;
    error: string | null;
} {
    const { getEmojiInfo, isLoading, error } = useEmoji();

    const emoji = useMemo(() => {
        if (isLoading || error) return null;

        const info = getEmojiInfo(shortcode);
        return info?.unicode || fallback || null;
    }, [shortcode, getEmojiInfo, isLoading, error, fallback]);

    return { emoji, isLoading, error };
}

// Hook cho emoji search với debouncing
export function useEmojiSearch(initialQuery: string = '', debounceMs: number = 300): {
    query: string;
    setQuery: (query: string) => void;
    results: EmojiInfo[];
    isSearching: boolean;
    error: string | null;
} {
    const [query, setQuery] = useState(initialQuery);
    const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
    const [isSearching, setIsSearching] = useState(false);

    const { searchEmojis, error, isLoading } = useEmoji();

    // Debounce query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
            setIsSearching(false);
        }, debounceMs);

        if (query !== debouncedQuery) {
            setIsSearching(true);
        }

        return () => clearTimeout(timer);
    }, [query, debounceMs, debouncedQuery]);

    // Search results
    const results = useMemo(() => {
        if (!debouncedQuery.trim() || isLoading) return [];
        return searchEmojis(debouncedQuery);
    }, [debouncedQuery, searchEmojis, isLoading]);

    return {
        query,
        setQuery,
        results,
        isSearching: isSearching || isLoading,
        error
    };
}
