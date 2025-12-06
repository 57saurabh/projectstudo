import axios from 'axios';

export async function getLocationFromIp(ip: string) {
    // If running locally, IP might be ::1 or 127.0.0.1, which won't work with external APIs
    if (ip === '::1' || ip === '127.0.0.1') {
        return null;
    }

    try {
        // Using ip-api.com (free tier, no API key required for non-commercial use, rate limited)
        // For production, consider a paid service or one with an API key
        const response = await axios.get(`http://ip-api.com/json/${ip}`);

        if (response.data.status === 'fail') {
            console.warn(`IP lookup failed for ${ip}: ${response.data.message}`);
            return null;
        }

        return {
            city: response.data.city,
            region: response.data.regionName,
            country: response.data.country,
            lat: response.data.lat,
            lon: response.data.lon,
            timezone: response.data.timezone,
            ip: response.data.query
        };
    } catch (error) {
        console.error('Error fetching location from IP:', error);
        return null;
    }
}

export function getIpFromRequest(req: Request): string | null {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    // Fallback for local development or direct connection
    // Note: Next.js Request object doesn't expose socket.remoteAddress directly in the same way as Node http
    // In Vercel/Next.js, x-forwarded-for is the standard way
    return null;
}
