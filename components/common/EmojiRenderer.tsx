'use client';

import React, { useMemo } from 'react';
import { useEmoji } from '@/hooks/useEmoji';

interface EmojiRendererProps {
    text: string;
    className?: string;
    style?: React.CSSProperties;
    renderMode?: 'image' | 'unicode' | 'auto';
}

export const EmojiRenderer: React.FC<EmojiRendererProps> = ({ 
    text, 
    className = '',
    style = {},
    renderMode = 'image'
}) => {
    const { emojiHelper, isLoading } = useEmoji();

    const processedContent = useMemo(() => {
        if (isLoading || !emojiHelper) {
            return text;
        }

        if (renderMode === 'unicode') {
            return emojiHelper.parseTextToUnicode(text);
        } else if (renderMode === 'image') {
            return emojiHelper.parseText(text);
        } else {
            // Auto mode: try image first, fallback to unicode
            try {
                return emojiHelper.parseText(text);
            } catch {
                return emojiHelper.parseTextToUnicode(text);
            }
        }
    }, [text, emojiHelper, isLoading, renderMode]);

    if (isLoading) {
        return <span className={className} style={style}>Loading emojis...</span>;
    }

    if (renderMode === 'image') {
        return (
            <span 
                className={`emoji-renderer ${className}`} 
                style={style}
                dangerouslySetInnerHTML={{ __html: processedContent }}
            />
        );
    }

    return (
        <span className={`emoji-renderer ${className}`} style={style}>
            {processedContent}
        </span>
    );
};

export default EmojiRenderer;
