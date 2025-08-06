import React, { memo, useMemo } from 'react';
import { useEmoji } from '@/hooks/useEmoji';
import { EmojiConfig } from '@/types/emoji';

interface EmojiProps {
    shortcode: string;
    fallback?: string;
    className?: string;
    style?: React.CSSProperties;
    size?: number;
    renderMode?: 'sprite' | 'unicode' | 'image' | 'auto';
    onClick?: (shortcode: string) => void;
    onError?: (shortcode: string, error: string) => void;
    title?: string;
    alt?: string;
}

export const Emoji = memo<EmojiProps>(({
    shortcode,
    fallback,
    className = '',
    style = {},
    size,
    renderMode = 'auto',
    onClick,
    onError,
    title,
    alt
}) => {
    const { getEmojiInfo, getSpriteStyle, isLoading, error } = useEmoji();

    const emojiInfo = useMemo(() => {
        if (isLoading) return null;
        return getEmojiInfo(shortcode);
    }, [shortcode, getEmojiInfo, isLoading]);

    // Handle error
    React.useEffect(() => {
        if (error && onError) {
            onError(shortcode, error);
        }
    }, [error, shortcode, onError]);

    // Determine render mode
    const finalRenderMode = useMemo(() => {
        if (renderMode !== 'auto') return renderMode;

        // Auto mode: prefer unicode, fallback to sprite
        if (emojiInfo?.unicode) return 'unicode';
        if (emojiInfo) return 'sprite';
        return 'unicode';
    }, [renderMode, emojiInfo]);

    // Handle click
    const handleClick = React.useCallback(() => {
        if (onClick) {
            onClick(shortcode);
        }
    }, [onClick, shortcode]);

    // Loading state
    if (isLoading) {
        return (
            <span
                className={`emoji-loading ${className}`}
                style={{ ...style, opacity: 0.5 }}
                title="Loading emoji..."
            >
                ⏳
            </span>
        );
    }

    // Error state or no emoji found
    if (!emojiInfo) {
        const fallbackContent = fallback || shortcode;
        return (
            <span
                className={`emoji-fallback ${className}`}
                style={style}
                title={title || `Emoji not found: ${shortcode}`}
                onClick={onClick ? handleClick : undefined}
            >
                {fallbackContent}
            </span>
        );
    }

    const commonProps = {
        className: `emoji ${className}`,
        style: size ? { ...style, fontSize: `${size}px` } : style,
        title: title || shortcode,
        onClick: onClick ? handleClick : undefined,
        role: onClick ? 'button' : undefined,
        tabIndex: onClick ? 0 : undefined
    };

    // Render based on mode
    switch (finalRenderMode) {
        case 'unicode':
            return (
                <span {...commonProps}>
                    {emojiInfo.unicode}
                </span>
            );

        case 'sprite':
            const spriteStyle = getSpriteStyle(shortcode);
            if (!spriteStyle) {
                return (
                    <span {...commonProps}>
                        {emojiInfo.unicode || fallback || shortcode}
                    </span>
                );
            }

            return (
                <span
                    {...commonProps}
                    style={{
                        ...commonProps.style,
                        ...spriteStyle,
                        ...(size && {
                            width: `${size}px`,
                            height: `${size}px`
                        })
                    }}
                    aria-label={alt || shortcode}
                />
            );

        case 'image':
            return (
                <img
                    src={emojiInfo.imagePath}
                    alt={alt || shortcode}
                    title={title || shortcode}
                    className={`emoji-image ${className}`}
                    style={{
                        width: size ? `${size}px` : '1em',
                        height: size ? `${size}px` : '1em',
                        verticalAlign: 'middle',
                        ...style
                    }}
                    onClick={onClick ? handleClick : undefined}
                    onError={() => onError && onError(shortcode, 'Image failed to load')}
                />
            );

        default:
            return (
                <span {...commonProps}>
                    {emojiInfo.unicode || fallback || shortcode}
                </span>
            );
    }
});

Emoji.displayName = 'Emoji';

// Text parser component
interface EmojiTextProps {
    children: string;
    className?: string;
    style?: React.CSSProperties;
    emojiProps?: Omit<EmojiProps, 'shortcode'>;
}

export const EmojiText = memo<EmojiTextProps>(({
    children,
    className = '',
    style = {},
    emojiProps = {}
}) => {
    const { parseText } = useEmoji();

    const parsedContent = useMemo(() => {
        const emojiRegex = /:([a-zA-Z0-9_+-]+):/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = emojiRegex.exec(children)) !== null) {
            // Add text before emoji
            if (match.index > lastIndex) {
                parts.push(children.slice(lastIndex, match.index));
            }

            // Add emoji component
            parts.push(
                <Emoji
                    key={`${match[1]}-${match.index}`}
                    shortcode={match[1]}
                    {...emojiProps}
                />
            );

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < children.length) {
            parts.push(children.slice(lastIndex));
        }

        return parts.length > 0 ? parts : [children];
    }, [children, emojiProps]);

    return (
        <span className={`emoji-text ${className}`} style={style}>
            {parsedContent}
        </span>
    );
});

EmojiText.displayName = 'EmojiText';

// Emoji picker component (basic)
interface EmojiPickerProps {
    onSelect: (shortcode: string, emojiInfo: any) => void;
    searchPlaceholder?: string;
    className?: string;
    maxResults?: number;
    size?: number;
}

export const EmojiPicker = memo<EmojiPickerProps>(({
    onSelect,
    searchPlaceholder = 'Search emojis...',
    className = '',
    maxResults = 50,
    size = 24
}) => {
    const [query, setQuery] = React.useState('');
    const { searchEmojis, getAllShortcodes, getEmojiInfo } = useEmoji();

    const results = useMemo(() => {
        if (!query.trim()) {
            // Show some popular emojis when no search
            const popular = [':smile:', ':heart:', ':thumbsup:', ':fire:', ':star:', ':eyes:', ':100:', ':ok_hand:'];
            return popular.map(shortcode => getEmojiInfo(shortcode.slice(1, -1))).filter(Boolean);
        }

        return searchEmojis(query).slice(0, maxResults);
    }, [query, searchEmojis, getEmojiInfo, maxResults]);

    const handleSelect = React.useCallback((emojiInfo: any) => {
        onSelect(emojiInfo.shortcode, emojiInfo);
    }, [onSelect]);

    return (
        <div className={`emoji-picker ${className}`}>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="emoji-picker-search"
            />

            <div className="emoji-picker-results">
                {results.map((emojiInfo) => (
                    emojiInfo ? (
                        <button
                            key={emojiInfo.shortcode}
                            className="emoji-picker-item"
                            onClick={() => handleSelect(emojiInfo)}
                            title={emojiInfo.shortcode}
                        >
                            <Emoji
                                shortcode={emojiInfo.shortcode}
                                size={size}
                                renderMode="unicode"
                            />
                        </button>
                    ) : null
                ))}
            </div>
        </div>
    );
});

EmojiPicker.displayName = 'EmojiPicker';

export default Emoji;
