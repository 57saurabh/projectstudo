export const COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "India", "China", "Japan", "Brazil",
    "Russia", "South Korea", "Italy", "Spain", "Mexico", "Indonesia", "Netherlands", "Saudi Arabia", "Turkey", "Switzerland",
    "Sweden", "Poland", "Belgium", "Thailand", "Iran", "Austria", "Norway", "United Arab Emirates", "Israel", "South Africa",
    "Hong Kong", "Denmark", "Singapore", "Malaysia", "Ireland", "Philippines", "Chile", "Finland", "Bangladesh",
    "Egypt", "Vietnam", "Portugal", "Czech Republic", "Romania", "New Zealand", "Greece", "Hungary", "Kuwait", "Qatar"
].sort();

export const LANGUAGES = [
    "English", "Spanish", "Mandarin", "Hindi", "Arabic", "Portuguese", "Bengali", "Russian", "Japanese", "Punjabi",
    "German", "Javanese", "Wu", "Malay", "Telugu", "Vietnamese", "Korean", "French", "Marathi", "Tamil",
    "Urdu", "Turkish", "Italian", "Yue", "Thai", "Gujarati", "Jin", "Southern Min", "Persian", "Polish",
    "Pashto", "Kannada", "Xiang", "Malayalam", "Sundanese", "Hausa", "Odia", "Burmese", "Hakka", "Ukrainian"
].sort();

export const INTERESTS_LIST = [
    "Music", "Movies", "Travel", "Food", "Gaming", "Technology", "Art", "Photography", "Reading", "Writing",
    "Sports", "Fitness", "Yoga", "Meditation", "Dancing", "Singing", "Coding", "Design", "Fashion", "Shopping",
    "Cars", "Bikes", "Nature", "Animals", "Pets", "History", "Science", "Space", "Politics", "Economics",
    "Business", "Entrepreneurship", "Investing", "Crypto", "Stocks", "Real Estate", "Education", "Learning",
    "Languages", "Culture", "Philosophy", "Psychology", "Sociology", "Religion", "Spirituality", "Astrology"
].sort();

export const UNIVERSITIES_LIST = [
    "Harvard University", "Stanford University", "Massachusetts Institute of Technology", "University of Oxford",
    "University of Cambridge", "California Institute of Technology", "Princeton University", "Yale University",
    "University of Chicago", "Imperial College London", "ETH Zurich", "University of Pennsylvania",
    "Columbia University", "Cornell University", "University of Michigan", "Johns Hopkins University",
    "University of Toronto", "University of Melbourne", "University of Sydney", "National University of Singapore",
    "Tsinghua University", "Peking University", "University of Tokyo", "Seoul National University",
    "Indian Institute of Technology Bombay", "Indian Institute of Technology Delhi", "Indian Institute of Technology Madras",
    "Indian Institute of Science", "University of Delhi", "Jawaharlal Nehru University"
].sort();

import { FLAG_IMAGES } from './flagImports';

export const COUNTRY_LANGUAGES_MAPPING: Record<string, { flag: any, languages: string[] }> = {
    "United States": { flag: FLAG_IMAGES["United States"], languages: ["English"] },
    "United Kingdom": { flag: FLAG_IMAGES["United Kingdom"], languages: ["English"] },
    "India": { flag: FLAG_IMAGES["India"], languages: ["Hindi", "English", "Bengali", "Telugu", "Marathi", "Tamil", "Urdu", "Gujarati", "Kannada", "Odia", "Malayalam", "Punjabi", "Assamese", "Maithili", "Sanskrit"] },
    "China": { flag: FLAG_IMAGES["China"], languages: ["Mandarin", "Cantonese"] },
    "Japan": { flag: FLAG_IMAGES["Japan"], languages: ["Japanese"] },
    "Germany": { flag: FLAG_IMAGES["Germany"], languages: ["German"] },
    "France": { flag: FLAG_IMAGES["France"], languages: ["French"] },
    "Spain": { flag: FLAG_IMAGES["Spain"], languages: ["Spanish"] },
    "Brazil": { flag: FLAG_IMAGES["Brazil"], languages: ["Portuguese"] },
    "Russia": { flag: FLAG_IMAGES["Russia"], languages: ["Russian"] },
    "South Korea": { flag: FLAG_IMAGES["South Korea"], languages: ["Korean"] },
    "Italy": { flag: FLAG_IMAGES["Italy"], languages: ["Italian"] },
    "Saudi Arabia": { flag: FLAG_IMAGES["Saudi Arabia"], languages: ["Arabic"] },
    "Turkey": { flag: FLAG_IMAGES["Turkey"], languages: ["Turkish"] },
    "Iran": { flag: FLAG_IMAGES["Iran"], languages: ["Persian"] },
    "Netherlands": { flag: FLAG_IMAGES["Netherlands"], languages: ["Dutch", "English"] },
    "Sweden": { flag: FLAG_IMAGES["Sweden"], languages: ["Swedish", "English"] },
    "Bangladesh": { flag: FLAG_IMAGES["Bangladesh"], languages: ["Bengali"] },
    "Vietnam": { flag: FLAG_IMAGES["Vietnam"], languages: ["Vietnamese"] },
    "Thailand": { flag: FLAG_IMAGES["Thailand"], languages: ["Thai"] },
    "Indonesia": { flag: FLAG_IMAGES["Indonesia"], languages: ["Indonesian"] },
    "Portugal": { flag: FLAG_IMAGES["Portugal"], languages: ["Portuguese"] },
    "Poland": { flag: FLAG_IMAGES["Poland"], languages: ["Polish"] },
    "Egypt": { flag: FLAG_IMAGES["Egypt"], languages: ["Arabic"] },
    "Mexico": { flag: FLAG_IMAGES["Mexico"], languages: ["Spanish"] },
    "Canada": { flag: FLAG_IMAGES["Canada"], languages: ["English", "French"] },
    "Australia": { flag: FLAG_IMAGES["Australia"], languages: ["English"] },
    "Switzerland": { flag: FLAG_IMAGES["Switzerland"], languages: ["German", "French", "Italian"] },
    "Belgium": { flag: FLAG_IMAGES["Belgium"], languages: ["Dutch", "French", "German"] },
    "Austria": { flag: FLAG_IMAGES["Austria"], languages: ["German"] },
    "Norway": { flag: FLAG_IMAGES["Norway"], languages: ["Norwegian"] },
    "United Arab Emirates": { flag: FLAG_IMAGES["United Arab Emirates"], languages: ["Arabic"] },
    "Israel": { flag: FLAG_IMAGES["Israel"], languages: ["Hebrew", "Arabic"] },
    "South Africa": { flag: FLAG_IMAGES["South Africa"], languages: ["Zulu", "Xhosa", "Afrikaans", "English"] },
    "Hong Kong": { flag: FLAG_IMAGES["Hong Kong"], languages: ["Cantonese", "English"] },
    "Denmark": { flag: FLAG_IMAGES["Denmark"], languages: ["Danish"] },
    "Singapore": { flag: FLAG_IMAGES["Singapore"], languages: ["English", "Malay", "Mandarin", "Tamil"] },
    "Malaysia": { flag: FLAG_IMAGES["Malaysia"], languages: ["Malay"] },
    "Ireland": { flag: FLAG_IMAGES["Ireland"], languages: ["English", "Irish"] },
    "Philippines": { flag: FLAG_IMAGES["Philippines"], languages: ["Filipino", "English"] },
    "Chile": { flag: FLAG_IMAGES["Chile"], languages: ["Spanish"] },
    "Finland": { flag: FLAG_IMAGES["Finland"], languages: ["Finnish", "Swedish"] },
    "Czech Republic": { flag: FLAG_IMAGES["Czech Republic"], languages: ["Czech"] },
    "Romania": { flag: FLAG_IMAGES["Romania"], languages: ["Romanian"] },
    "New Zealand": { flag: FLAG_IMAGES["New Zealand"], languages: ["English", "Maori"] },
    "Greece": { flag: FLAG_IMAGES["Greece"], languages: ["Greek"] },
    "Hungary": { flag: FLAG_IMAGES["Hungary"], languages: ["Hungarian"] },
    "Kuwait": { flag: FLAG_IMAGES["Kuwait"], languages: ["Arabic"] },
    "Qatar": { flag: FLAG_IMAGES["Qatar"], languages: ["Arabic"] }
};

// Helper to get all flags for UI
export const LANGUAGE_FLAGS = Object.entries(COUNTRY_LANGUAGES_MAPPING).map(([country, data]) => ({
    country,
    flag: data.flag,
    languages: data.languages
}));
