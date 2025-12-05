
const adjectives = [
    "Silly", "Wacky", "Bouncing", "Sleepy", "Grumpy", "Happy", "Sneezy", "Dopey", "Bashful", "Doc",
    "Cheeky", "Loud", "Quiet", "Fast", "Slow", "Shiny", "Fluffy", "Spiky", "Round", "Square",
    "Giggly", "Clumsy", "Brave", "Cowardly", "Lucky", "Unlucky", "Tasty", "Spicy", "Sweet", "Sour",
    "Fuzzy", "Bald", "Hairy", "Tall", "Short", "Big", "Small", "Tiny", "Giant", "Massive",
    "Crazy", "Lazy", "Busy", "Dizzy", "Fizzy", "Jolly", "Sad", "Angry", "Calm", "Relaxed",
    "Funky", "Groovy", "Cool", "Hot", "Cold", "Warm", "Dry", "Wet", "Slippery", "Sticky",
    "Smooth", "Rough", "Hard", "Soft", "Heavy", "Light", "Dark", "Bright", "Dim", "Glowing",
    "Neon", "Pastel", "Rainbow", "Polka", "Striped", "Spotted", "Checked", "Plaid", "Paisley", "Floral",
    "Ancient", "Modern", "Future", "Retro", "Vintage", "Antique", "Rusty", "Shiny", "New", "Old",
    "Young", "Elderly", "Baby", "Teen", "Adult", "Child", "Kid", "Toddler", "Infant", "Senior"
];

const nouns = [
    "Banana", "Pancake", "Waffle", "Burger", "Pizza", "Taco", "Burrito", "Nachos", "Fries", "Shake",
    "Apple", "Orange", "Grape", "Melon", "Berry", "Cherry", "Lemon", "Lime", "Kiwi", "Mango",
    "Dog", "Cat", "Mouse", "Rat", "Bird", "Fish", "Cow", "Pig", "Sheep", "Goat",
    "Horse", "Duck", "Goose", "Hen", "Rooster", "Chick", "Lamb", "Calf", "Foal", "Kid",
    "Lion", "Tiger", "Bear", "Wolf", "Fox", "Deer", "Elk", "Moose", "Camel", "Llama",
    "Monkey", "Ape", "Gorilla", "Chimp", "Lemur", "Sloth", "Koala", "Panda", "Otter", "Seal",
    "Whale", "Dolphin", "Shark", "Crab", "Lobster", "Shrimp", "Squid", "Octopus", "Jelly", "Star",
    "Robot", "Alien", "Ghost", "Zombie", "Ninja", "Pirate", "Wizard", "Witch", "Knight", "Dragon",
    "King", "Queen", "Prince", "Princess", "Duke", "Duchess", "Baron", "Baroness", "Lord", "Lady"
];

export const generateHumorousUsername = (): string => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 10000);
    return `${adj}${noun}_${num}`;
};
