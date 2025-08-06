export interface EmojiData {
    [shortcode: string]: string; // shortcode -> unicode
}

export interface EmojiPosition {
    [shortcode: string]: string; // shortcode -> "x% y%"
}

export interface EmojiConfig {
    spriteSize: 16 | 24 | 26 | 32 | 40 | 64;
    spriteSheetPath: string;
    enableFallback?: boolean;
}

export interface EmojiSpriteInfo {
    row: number;
    column: number;
    x: number;
    y: number;
}

export interface EmojiInfo {
    shortcode: string;
    unicode: string;
    position: {
        x: string;
        y: string;
    };
    spriteInfo: EmojiSpriteInfo;
    imagePath: string;
}
