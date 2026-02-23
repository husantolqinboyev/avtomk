
const latinToCyrillicMap: Record<string, string> = {
    "A": "А", "B": "Б", "D": "Д", "E": "Э", "F": "Ф", "G": "Г", "H": "Ҳ", "I": "И", "J": "Ж", "K": "К", "L": "Л", "M": "М", "N": "Н", "O": "О", "P": "П", "Q": "Қ", "R": "Р", "S": "С", "T": "Т", "U": "У", "V": "В", "X": "Х", "Y": "Й", "Z": "З",
    "a": "а", "b": "б", "d": "д", "e": "е", "f": "ф", "g": "г", "h": "ҳ", "i": "и", "j": "ж", "k": "к", "l": "л", "m": "м", "n": "н", "o": "о", "p": "п", "q": "қ", "r": "р", "s": "с", "t": "т", "u": "у", "v": "в", "x": "х", "y": "й", "z": "з",
    "O'": "Ў", "G'": "Ғ", "Sh": "Ш", "Ch": "Ч", "Yo": "Ё", "Yu": "Ю", "Ya": "Я", "Ye": "Е",
    "o'": "ў", "g'": "ғ", "sh": "ш", "ch": "ч", "yo": "ё", "yu": "ю", "ya": "я", "ye": "е"
};

export function latinToCyrillic(text: string): string {
    if (!text) return text;

    let result = text;

    // Replace special pairs first (O', G', Sh, Ch, etc.)
    // We need to be careful with case sensitivity and multi-char sequences
    const pairs = [
        ["O'", "Ў"], ["G'", "Ғ"], ["Sh", "Ш"], ["Ch", "Ч"], ["Yo", "Ё"], ["Yu", "Ю"], ["Ya", "Я"], ["Ye", "Е"],
        ["o'", "ў"], ["g'", "ғ"], ["sh", "ш"], ["ch", "ч"], ["yo", "ё"], ["yu", "ю"], ["ya", "я"], ["ye", "е"]
    ];

    for (const [lat, cyr] of pairs) {
        const regex = new RegExp(lat, 'g');
        result = result.replace(regex, cyr);
    }

    // Handle 'e' specifically: 'e' at the start of a word or after a vowel should be 'э' in Cyrillic,
    // but in simpler implementations 'е' is often fine. 
    // Let's do a simple 1-to-1 for the rest.
    const chars = result.split("");
    for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        if (latinToCyrillicMap[char] && char.length === 1) {
            chars[i] = latinToCyrillicMap[char];
        }
    }

    return chars.join("");
}
