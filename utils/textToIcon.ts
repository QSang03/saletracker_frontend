// utils/textToIcon.ts

import { EmojiMap } from "./emojiMapper";

export function convertTextToIcons(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let convertedText = text;
  
  // Sort patterns by length (longest first) để tránh conflict
  const sortedPatterns = Object.keys(EmojiMap)
    .filter(pattern => pattern !== "") // Bỏ qua empty string
    .sort((a, b) => b.length - a.length);
  
  // Thay thế từng pattern
  sortedPatterns.forEach(pattern => {
    if (convertedText.includes(pattern)) {
      // Sử dụng split và join để thay thế tất cả occurrences
      convertedText = convertedText.split(pattern).join(EmojiMap[pattern]);
    }
  });
  
  return convertedText;
}

// Alternative function với regex cho performance tốt hơn
export function convertTextToIconsRegex(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let convertedText = text;
  
  const sortedPatterns = Object.keys(EmojiMap)
    .filter(pattern => pattern !== "")
    .sort((a, b) => b.length - a.length);
  
  sortedPatterns.forEach(pattern => {
    // Escape special regex characters
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedPattern, 'g');
    convertedText = convertedText.replace(regex, EmojiMap[pattern]);
  });
  
  return convertedText;
}
