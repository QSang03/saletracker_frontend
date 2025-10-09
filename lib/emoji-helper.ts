import { EmojiData, EmojiPosition, EmojiConfig, EmojiInfo, EmojiSpriteInfo } from '@/types/emoji';

// Singleton instance để tránh load data nhiều lần
let singletonInstance: EmojiHelper | null = null;
let singletonPromise: Promise<EmojiHelper> | null = null;

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
     * Tạo EmojiHelper với singleton pattern để tránh load data nhiều lần
     */
    static async createWithAllPositions(config?: EmojiConfig): Promise<EmojiHelper> {
        // Sử dụng singleton instance nếu đã có
        if (singletonInstance) {
            return singletonInstance;
        }

        // Nếu đang trong quá trình loading, đợi promise đó
        if (singletonPromise) {
            return singletonPromise;
        }

        const defaultConfig: EmojiConfig = {
            spriteSize: 32,
            spriteSheetPath: '/emoji/emoji-32',
            enableFallback: true,
        };

        const finalConfig = { ...defaultConfig, ...(config || {}) };

        // Tạo promise để load data
        singletonPromise = (async () => {
            try {
                
                // Sử dụng emoji-pos-all.json làm nguồn chính vì nó có đầy đủ shortcodes
                const [emojiDataResponse, emojiPositionsResponse] = await Promise.all([
                    fetch('/emoji/emoji-data.json'),
                    fetch('/emoji/emoji-pos-all.json')
                ]);

                if (!emojiDataResponse.ok || !emojiPositionsResponse.ok) {
                    console.error('Failed to fetch emoji data:', {
                        dataOk: emojiDataResponse.ok,
                        dataStatus: emojiDataResponse.status,
                        positionsOk: emojiPositionsResponse.ok,
                        positionsStatus: emojiPositionsResponse.status
                    });
                    
                    const [fallbackDataResponse, fallbackPositionsResponse] = await Promise.all([
                        fetch('/emoji/emoji-data-simple.json'),
                        fetch('/emoji/emoji-pos-simple.json')
                    ]);
                    
                    if (!fallbackDataResponse.ok || !fallbackPositionsResponse.ok) {
                        throw new Error(`Failed to fetch fallback emoji data: ${fallbackDataResponse.status}, ${fallbackPositionsResponse.status}`);
                    }

                    const emojiData = await fallbackDataResponse.json();
                    const emojiPositions = await fallbackPositionsResponse.json();
                    const instance = new EmojiHelper(emojiData, emojiPositions, finalConfig);
                    singletonInstance = instance;
                    return instance;
                }

                const emojiData = await emojiDataResponse.json();
                const emojiPositions = await emojiPositionsResponse.json();

                const instance = new EmojiHelper(emojiData, emojiPositions, finalConfig);
                singletonInstance = instance;
                return instance;
            } catch (error) {
                console.error('Error loading emoji data:', error);
                
                // Tạo một helper cơ bản với một số emoji thông dụng
                const basicEmojiData = {
                    ':)': '😊',
                    ':d': '😄', 
                    ':D': '😄',
                    ':(': '😢',
                    ':p': '😛',
                    ':P': '😛',
                    ':o': '😮',
                    ':O': '😮'
                };
                
                const basicPositions = {};
                const instance = new EmojiHelper(basicEmojiData, basicPositions, finalConfig);
                singletonInstance = instance;
                return instance;
            } finally {
                // Clear promise after completion
                singletonPromise = null;
            }
        })();

        return singletonPromise;
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
        // Dựa vào cấu trúc file: có 51 columns (0-50) và 41 rows (1-41)
        // x% tương ứng với column: x / 2 (do 100% / 50 columns = 2% per column)
        // y% tương ứng với row: (y / 2.5) + 1 (do 100% / 40 rows = 2.5% per row, và rows bắt đầu từ 1)
        
        const column = Math.round(x / 2) + 1; // 1-based, từ 1 đến 51
        const row = Math.round(y / 2.5) + 1; // 1-based, từ 1 đến 41

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
        return `${this.config.spriteSheetPath}/row-${row}-column-${column}.png`;
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
            backgroundImage: `url(${this.config.spriteSheetPath}/emoji-sprite-${this.config.spriteSize}.png)`,
            backgroundPosition: `${info.position.x} ${info.position.y}`,
            backgroundSize: '100% auto',
            width: `${this.config.spriteSize}px`,
            height: `${this.config.spriteSize}px`,
            display: 'inline-block'
        };
    }

    /**
     * Tìm shortcode từ unicode emoji
     */
    findShortcodeByUnicode(unicode: string): string | null {
        for (const [shortcode, emojiUnicode] of Object.entries(this.emojiData)) {
            if (emojiUnicode === unicode) {
                return shortcode;
            }
        }
        return null;
    }

    /**
     * Convert text có emoji shortcode và unicode thành HTML với ảnh emoji
     */
    parseText(text: string): string {
        // Regex for shortcode patterns - expanded to catch ALL Zalo shortcodes
        // Ensure longer patterns like :)) are matched before :)
        const shortcodeRegex = /:([a-zA-Z0-9_+-]+):|:\)\)|:\'\)|(?<!\w):b(?!\w)|:~|(<3|<\/3|:\)|:-\)|8-\)|:-\(\(|:\$|:3|:z|:\(\(|&-\(|:-h|(?<!\w):p(?!\w)|(?<!\w):d(?!\w)|(?<!\w):o(?!\w)|:\(|;\-\)|--b|:\)\)|:-\*|(?<!\w);p(?!\w)|;\-d|\/-showlove|(?<!\w);d(?!\w)|(?<!\w);o(?!\w)|(?<!\w);g(?!\w)|\|-\)|:!|(?<!\w):l(?!\w)|:>|:;|(?<!\w);f(?!\w)|(?<!\w):v(?!\w)|:wipe|:-dig|:handclap|b-\)|:-r|:-<|:-o|;\-s|;\?|;\-x|:-f|8\*\)|(?<!\w);!(?!\w)|;\-!|(?<!\w);xx(?!\w)|:-bye|>-\||p-\(|:--\||:q|x-\)|:\*|;\-a|8\*|:\||(?<!\w):x(?!\w)|(?<!\w):t(?!\w)|;\-\/|(?<!\w);l(?!\w)|\$-\)|\/-beer|\/-coffee|\/-rose|\/-fade|\/-bd|\/-bome|\/-cake|\/-heart|\/-break|\/-shit|\/-li|\/-flag|\/-strong|\/-weak|(?<!\w);ok(?!\w)|(?<!\w);v(?!\w)|\/-thanks|\/-punch|\/-share|_\(\)_|(?<!\w);no(?!\w)|(?<!\w);bad(?!\w)|\/-loveu)/gi;
        
        // Regex for unicode emoji - includes flag emoji (regional indicators) and comprehensive emoji ranges
        const unicodeEmojiRegex = /(?:[\u{1f1e6}-\u{1f1ff}][\u{1f1e6}-\u{1f1ff}])|[\u{1f600}-\u{1f64f}]|[\u{1f300}-\u{1f5ff}]|[\u{1f680}-\u{1f6ff}]|[\u{1f1e0}-\u{1f1ff}]|[\u{2600}-\u{26ff}]|[\u{2700}-\u{27bf}]|[\u{1f900}-\u{1f9ff}]|[\u{1f018}-\u{1f270}]|[\u{238c}-\u{2454}]|[\u{20d0}-\u{20ff}]|[\u{fe0f}]|[\u{200d}]|[\u{3030}]|[\u{303d}]|[\u{3297}]|[\u{3299}]|[\u{1f004}]|[\u{1f0cf}]|[\u{1f170}-\u{1f189}]|[\u{1f18e}]|[\u{1f191}-\u{1f19a}]|[\u{1f1e6}-\u{1f1ff}]|[\u{1f201}-\u{1f202}]|[\u{1f21a}]|[\u{1f22f}]|[\u{1f232}-\u{1f23a}]|[\u{1f250}-\u{1f251}]|[\u{00a9}]|[\u{00ae}]|[\u{203c}]|[\u{2049}]|[\u{2122}]|[\u{2139}]|[\u{2194}-\u{2199}]|[\u{21a9}-\u{21aa}]|[\u{231a}-\u{231b}]|[\u{2328}]|[\u{23cf}]|[\u{23e9}-\u{23f3}]|[\u{23f8}-\u{23fa}]|[\u{24c2}]|[\u{25aa}-\u{25ab}]|[\u{25b6}]|[\u{25c0}]|[\u{25fb}-\u{25fe}]|[\u{2600}-\u{2604}]|[\u{260e}]|[\u{2611}]|[\u{2614}-\u{2615}]|[\u{2618}]|[\u{261d}]|[\u{2620}]|[\u{2622}-\u{2623}]|[\u{2626}]|[\u{262a}]|[\u{262e}-\u{262f}]|[\u{2638}-\u{263a}]|[\u{2640}]|[\u{2642}]|[\u{2648}-\u{2653}]|[\u{2660}]|[\u{2663}]|[\u{2665}-\u{2666}]|[\u{2668}]|[\u{267b}]|[\u{267f}]|[\u{2692}-\u{2697}]|[\u{2699}]|[\u{269b}-\u{269c}]|[\u{26a0}-\u{26a1}]|[\u{26aa}-\u{26ab}]|[\u{26b0}-\u{26b1}]|[\u{26bd}-\u{26be}]|[\u{26c4}-\u{26c5}]|[\u{26c8}]|[\u{26ce}-\u{26cf}]|[\u{26d1}]|[\u{26d3}-\u{26d4}]|[\u{26e9}-\u{26ea}]|[\u{26f0}-\u{26f5}]|[\u{26f7}-\u{26fa}]|[\u{26fd}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270d}]|[\u{270f}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271d}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274c}]|[\u{274e}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27a1}]|[\u{27b0}]|[\u{27bf}]|[\u{2934}-\u{2935}]|[\u{2b05}-\u{2b07}]|[\u{2b1b}-\u{2b1c}]|[\u{2b50}]|[\u{2b55}]|[\u{3030}]|[\u{303d}]|[\u{3297}]|[\u{3299}]/gu;

        let result = text;

        // First, replace shortcode patterns
        result = result.replace(shortcodeRegex, (match) => {
            // Normalize match để tìm trong data
            const normalizedMatch = match.toLowerCase();
            
            const info = this.getEmojiInfo(normalizedMatch);
            if (info) {
                const imagePath = info.imagePath;
                return `<img src="${imagePath}" alt="${info.unicode || match}" title="${match}" class="emoji-image" style="width: ${this.config.spriteSize}px; height: ${this.config.spriteSize}px; vertical-align: middle; display: inline-block;" onError="this.style.display='none'; this.nextSibling.style.display='inline';" /><span class="emoji-fallback" style="display: none;">${info.unicode || match}</span>`;
            }
            return match;
        });

        // Then, replace unicode emoji
        result = result.replace(unicodeEmojiRegex, (match) => {
            // Tìm shortcode từ unicode
            const shortcode = this.findShortcodeByUnicode(match);
            if (shortcode) {
                const info = this.getEmojiInfo(shortcode);
                if (info) {
                    const imagePath = info.imagePath;
                    return `<img src="${imagePath}" alt="${match}" title="${shortcode}" class="emoji-image" style="width: ${this.config.spriteSize}px; height: ${this.config.spriteSize}px; vertical-align: middle; display: inline-block;" onError="this.style.display='none'; this.nextSibling.style.display='inline';" /><span class="emoji-fallback" style="display: none;">${match}</span>`;
                }
            }
            return match;
        });

        return result;
    }

    /**
     * Convert text có emoji shortcode thành text với Unicode emoji
     */
    parseTextToUnicode(text: string): string {
        // Regex để match cả :shortcode: và các shortcode đặc biệt
        const emojiRegex = /:([a-zA-Z0-9_+-]+):|(<3|<\/3|:\)|:-\)|:\(|:-\(|:D|:-D|:P|:-P|;\)|;-\)|:o|:-o|:\||:-\||:\/|:-\/|[:;][\-~]?[\(\)\[\]{}<>@#$%^&*+=|\\/]|[:;][a-zA-Z0-9]|[-=][\(\)]|[_()]|\/-[a-zA-Z]+|:b|:~|:d)/gi;

        return text.replace(emojiRegex, (match) => {
            const normalizedMatch = match.toLowerCase();
            const info = this.getEmojiInfo(normalizedMatch);
            if (info && info.unicode) {
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
        return `<img src="${info.imagePath}" alt="${shortcode}" title="${shortcode}"${classAttr} width="${this.config.spriteSize}" height="${this.config.spriteSize}" />`;
    }
}

// Factory function để tạo EmojiHelper với singleton pattern
export async function createEmojiHelper(
    config?: EmojiConfig,
    dataPath: string = '/emoji'
): Promise<EmojiHelper> {
    try {
        // Sử dụng singleton method để tránh load data nhiều lần
        return await EmojiHelper.createWithAllPositions(config);
    } catch (error) {
        console.error('Failed to create EmojiHelper:', error);
        throw error;
    }
}

// Default config
export const defaultEmojiConfig: EmojiConfig = {
    spriteSize: 24,
    spriteSheetPath: '/emoji/emoji-24',
    enableFallback: true,
};
