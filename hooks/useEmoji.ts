import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EmojiHelper, createEmojiHelper, defaultEmojiConfig } from '@/lib/emoji-helper';
import { EmojiConfig, EmojiInfo } from '@/types/emoji';

// (Removed invalid interface definition)

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

// Global singleton state để share across all hook instances
let globalEmojiHelper: EmojiHelper | null = null;
let globalLoadingPromise: Promise<EmojiHelper> | null = null;
let globalError: string | null = null;
let globalIsLoading: boolean = false;

// Listeners để notify tất cả instances khi state thay đổi
const listeners = new Set<() => void>();

const notifyListeners = () => {
    listeners.forEach(listener => listener());
};

export function useEmoji(options: UseEmojiOptions = {}): UseEmojiReturn {
    const {
        config = {},
        dataPath = '/emoji',
        autoLoad = true
    } = options;

    const [, setUpdateCounter] = useState(0); // Force re-render
    const forceUpdate = useCallback(() => setUpdateCounter(c => c + 1), []);
    const listenerRef = useRef<(() => void) | null>(null);

    // Merge default config với user config
    const finalConfig = useMemo(() => ({
        ...defaultEmojiConfig,
        ...config
    }), [config]);

    // Register listener để nhận updates từ global state
    useEffect(() => {
        listenerRef.current = forceUpdate;
        listeners.add(forceUpdate);
        
        return () => {
            if (listenerRef.current) {
                listeners.delete(listenerRef.current);
            }
        };
    }, [forceUpdate]);

    // Load emoji helper với singleton pattern
    const loadEmojiHelper = useCallback(async () => {
        // Nếu đã có instance, return ngay
        if (globalEmojiHelper) {
            return globalEmojiHelper;
        }

        // Nếu đang loading, đợi promise đó
        if (globalLoadingPromise) {
            return globalLoadingPromise;
        }

        try {
            globalIsLoading = true;
            globalError = null;
            notifyListeners();

            globalLoadingPromise = createEmojiHelper(finalConfig, dataPath);
            const helper = await globalLoadingPromise;
            
            globalEmojiHelper = helper;
            globalIsLoading = false;
            globalLoadingPromise = null;
            notifyListeners();
            
            return helper;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load emoji data';
            globalError = errorMessage;
            globalIsLoading = false;
            globalLoadingPromise = null;
            notifyListeners();
            
            console.error('Error loading emoji helper:', err);
            throw err;
        }
    }, [finalConfig, dataPath]);

    // Auto load on mount
    useEffect(() => {
        if (autoLoad && !globalEmojiHelper && !globalLoadingPromise) {
            loadEmojiHelper();
        }
    }, [autoLoad, loadEmojiHelper]);

    // Memoized helper methods sử dụng global state
    const getEmojiInfo = useCallback((shortcode: string): EmojiInfo | null => {
        return globalEmojiHelper?.getEmojiInfo(shortcode) || null;
    }, []);

    const parseText = useCallback((text: string): string => {
        return globalEmojiHelper?.parseText(text) || text;
    }, []);

    const searchEmojis = useCallback((query: string): EmojiInfo[] => {
        return globalEmojiHelper?.searchEmojis(query) || [];
    }, []);

    const getSpriteStyle = useCallback((shortcode: string): React.CSSProperties | null => {
        return globalEmojiHelper?.getEmojiStyle(shortcode) || null;
    }, []);

    const hasEmoji = useCallback((shortcode: string): boolean => {
        return globalEmojiHelper?.hasEmoji(shortcode) || false;
    }, []);

    const getAllShortcodes = useCallback((): string[] => {
        return globalEmojiHelper?.getAllShortcodes() || [];
    }, []);

    const reload = useCallback(async (): Promise<void> => {
        // Reset global state
        globalEmojiHelper = null;
        globalLoadingPromise = null;
        globalError = null;
        await loadEmojiHelper();
    }, [loadEmojiHelper]);

    return {
        emojiHelper: globalEmojiHelper,
        isLoading: globalIsLoading,
        error: globalError,
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
    const { getEmojiInfo } = useEmoji();

    const emoji = useMemo(() => {
        if (globalIsLoading || globalError) return null;

        const info = getEmojiInfo(shortcode);
        return info?.unicode || fallback || null;
    }, [shortcode, getEmojiInfo, fallback]);

    return { 
        emoji, 
        isLoading: globalIsLoading, 
        error: globalError 
    };
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
