export class ModerationService {
    private badWords: Set<string>;

    constructor() {
        this.badWords = new Set([
            // English
            'abuse', 'idiot', 'stupid', 'kill', 'murder', 'hate', 'racist', 'sex', 'porn', 'nude',
            // Hindi / Hinglish
            'kutta', 'kamine', 'saale', 'harami', 'chutiya', 'bhosdike', 'madarchod', 'behenchod',
            'randi', 'gand', 'lund', 'choot', 'bhadwa', 'kamina', 'suar',
            'pagal', 'ullu', 'gadha', 'besharam'
        ]);
    }

    public filterContent(text: string): string {
        const words = text.split(/\s+/);
        const filteredWords = words.map(word => {
            const lowerWord = word.toLowerCase().replace(/[^\w\s]/gi, ''); // Remove punctuation for check
            if (this.badWords.has(lowerWord)) {
                return '*'.repeat(word.length);
            }
            return word;
        });
        return filteredWords.join(' ');
    }

    public isAbusive(text: string): boolean {
        const words = text.split(/\s+/);
        return words.some(word => {
            const lowerWord = word.toLowerCase().replace(/[^\w\s]/gi, '');
            return this.badWords.has(lowerWord);
        });
    }
}
