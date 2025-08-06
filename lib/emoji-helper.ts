import { EmojiData, EmojiPosition, EmojiConfig, EmojiInfo, EmojiSpriteInfo } from '@/types/emoji';

export class EmojiHelper {
    private emojiData: EmojiData;
    private emojiPositions: EmojiPosition;
    private config: EmojiConfig;
    private spriteColumns: number = 51; // Dựa vào cấu trúc thư mục, có 51 columns

    constructor(
        emojiData: EmojiData,
        emojiPositions: EmojiPosition,
        config: EmojiConfig
    ) {
        this.emojiData = emojiData;
        this.emojiPositions = emojiPositions;
        this.config = config;
    }

    /**
     * Lấy thông tin emoji từ shortcode
     */
    getEmojiInfo(shortcode: string): EmojiInfo | null {
        const unicode = this.emojiData[shortcode];
        const position = this.emojiPositions[shortcode];

        if (!unicode || !position) {
            return null;
        }

        const [x, y] = position.split(' ');
        const spriteInfo = this.parsePosition(x, y);
        const imagePath = this.getImagePath(spriteInfo);

        return {
            shortcode,
            unicode,
            position: { x, y },
            spriteInfo,
            imagePath
        };
    }

    /**
     * Parse position từ % sang row/column và tọa độ pixel
     */
    private parsePosition(xPercent: string, yPercent: string): EmojiSpriteInfo {
        const x = parseFloat(xPercent.replace('%', ''));
        const y = parseFloat(yPercent.replace('%', ''));

        // Tính toán row và column dựa vào phần trăm
        // Giả sử có 51 columns và khoảng 41 rows (dựa vào cấu trúc file)
        const column = Math.round((x / 100) * 50) + 1; // 1-based
        const row = Math.round((y / 100) * 40) + 1; // 1-based

        return {
            row,
            column,
            x,
            y
        };
    }

    /**
     * Lấy đường dẫn đến file ảnh emoji
     */
    private getImagePath(spriteInfo: EmojiSpriteInfo): string {
        const { row, column } = spriteInfo;
        return `${this.config.basePath}/emoji-${this.config.size}/row-${row}-column-${column}.png`;
    }

    /**
     * Lấy CSS background-position cho sprite
     */
    getSpritePosition(shortcode: string): string | null {
        const info = this.getEmojiInfo(shortcode);
        if (!info) return null;

        return `${info.position.x} ${info.position.y}`;
    }

    /**
     * Lấy style object cho emoji sprite
     */
    getEmojiStyle(shortcode: string): React.CSSProperties | null {
        const info = this.getEmojiInfo(shortcode);
        if (!info) return null;

        return {
            backgroundImage: `url(${this.config.basePath}/emoji-sprite-${this.config.size}.png)`,
            backgroundPosition: `${info.position.x} ${info.position.y}`,
            backgroundSize: '100% auto',
            width: `${this.config.size}px`,
            height: `${this.config.size}px`,
            display: 'inline-block'
        };
    }

    /**
     * Convert text có emoji shortcode thành HTML
     */
    parseText(text: string): string {
        const emojiRegex = /:([a-zA-Z0-9_+-]+):/g;

        return text.replace(emojiRegex, (match, shortcode) => {
            const info = this.getEmojiInfo(shortcode);
            if (info) {
                return info.unicode;
            }
            return match; // Giữ nguyên nếu không tìm thấy
        });
    }

    /**
     * Lấy danh sách tất cả emoji shortcodes
     */
    getAllShortcodes(): string[] {
        return Object.keys(this.emojiData);
    }

    /**
     * Tìm kiếm emoji theo shortcode
     */
    searchEmojis(query: string): EmojiInfo[] {
        const results: EmojiInfo[] = [];
        const lowerQuery = query.toLowerCase();

        for (const shortcode of Object.keys(this.emojiData)) {
            if (shortcode.toLowerCase().includes(lowerQuery)) {
                const info = this.getEmojiInfo(shortcode);
                if (info) {
                    results.push(info);
                }
            }
        }

        return results;
    }

    /**
     * Kiểm tra emoji có tồn tại không
     */
    hasEmoji(shortcode: string): boolean {
        return shortcode in this.emojiData;
    }

    /**
     * Lấy Unicode từ shortcode
     */
    getUnicode(shortcode: string): string | null {
        return this.emojiData[shortcode] || null;
    }

    /**
     * Convert emoji shortcode thành img tag cho individual images
     */
    toImageTag(shortcode: string, className?: string): string | null {
        const info = this.getEmojiInfo(shortcode);
        if (!info) return null;

        const classAttr = className ? ` class="${className}"` : '';
        return `<img src="${info.imagePath}" alt="${shortcode}" title="${shortcode}"${classAttr} width="${this.config.size}" height="${this.config.size}" />`;
    }
}

// Factory function để tạo EmojiHelper
export async function createEmojiHelper(
    config: EmojiConfig,
    dataPath: string = '/emoji'
): Promise<EmojiHelper> {
    try {
        // Load emoji data và positions
        const [emojiDataResponse, emojiPositionsResponse] = await Promise.all([
            fetch(`${dataPath}/emoji-data.json`),
            fetch(`${dataPath}/emoji-pos.json`)
        ]);

        const emojiData: EmojiData = await emojiDataResponse.json();
        const emojiPositions: EmojiPosition = await emojiPositionsResponse.json();

        return new EmojiHelper(emojiData, emojiPositions, config);
    } catch (error) {
        console.error('Failed to create EmojiHelper:', error);
        throw error;
    }
}

// Default config
export const defaultEmojiConfig: EmojiConfig = {
    size: 24,
    basePath: '/emoji'
};
