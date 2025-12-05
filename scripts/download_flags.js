const fs = require('fs');
const path = require('path');
const https = require('https');

const COUNTRIES = {
    "United States": "us", "United Kingdom": "gb", "Canada": "ca", "Australia": "au", "Germany": "de", "France": "fr", "India": "in", "China": "cn", "Japan": "jp", "Brazil": "br",
    "Russia": "ru", "South Korea": "kr", "Italy": "it", "Spain": "es", "Mexico": "mx", "Indonesia": "id", "Netherlands": "nl", "Saudi Arabia": "sa", "Turkey": "tr", "Switzerland": "ch",
    "Sweden": "se", "Poland": "pl", "Belgium": "be", "Thailand": "th", "Iran": "ir", "Austria": "at", "Norway": "no", "United Arab Emirates": "ae", "Israel": "il", "South Africa": "za",
    "Hong Kong": "hk", "Denmark": "dk", "Singapore": "sg", "Malaysia": "my", "Ireland": "ie", "Philippines": "ph", "Chile": "cl", "Finland": "fi", "Bangladesh": "bd",
    "Egypt": "eg", "Vietnam": "vn", "Portugal": "pt", "Czech Republic": "cz", "Romania": "ro", "New Zealand": "nz", "Greece": "gr", "Hungary": "hu", "Kuwait": "kw", "Qatar": "qa"
};

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
};

const main = async () => {
    const targetDir = path.join(__dirname, '../src/assets/flag_svg');
    
    console.log(`Downloading flags to ${targetDir}...`);

    for (const [country, code] of Object.entries(COUNTRIES)) {
        const url = `https://flagcdn.com/w320/${code}.png`; // Using PNG for easier handling in Next.js Image or we can use SVG
        // User asked for SVG. Let's try SVG from flagicons or similar.
        // flagcdn supports svg: https://flagcdn.com/${code}.svg
        const svgUrl = `https://flagcdn.com/${code}.svg`;
        const dest = path.join(targetDir, `${country.replace(/ /g, '_')}.svg`);
        
        try {
            await downloadFile(svgUrl, dest);
            console.log(`Downloaded ${country}`);
        } catch (err) {
            console.error(`Error downloading ${country}:`, err.message);
        }
    }
};

main();
