/**
 * Geolocation Utility
 * Handles browser geolocation and reverse geocoding using OpenStreetMap Nominatim API
 */

/**
 * Get current GPS coordinates from browser
 * @returns {Promise<{lat: number, lng: number}>}
 */
export const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('Location permission denied. Please enable location access.'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('Location information unavailable.'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('Location request timed out.'));
                        break;
                    default:
                        reject(new Error('Unable to get location.'));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes cache
            }
        );
    });
};

/**
 * Reverse geocode coordinates to address using OpenStreetMap Nominatim (free, no API key)
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<string>} Formatted location string
 */
export const reverseGeocode = async (lat, lng) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            {
                headers: {
                    'User-Agent': 'Hope3-Attendance-Tracker/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding failed');
        }

        const data = await response.json();
        const address = data.address;

        // Build location string: Neighborhood/Suburb, City, State
        const parts = [];

        // Add neighborhood or suburb
        if (address.neighbourhood) parts.push(address.neighbourhood);
        else if (address.suburb) parts.push(address.suburb);
        else if (address.village) parts.push(address.village);
        else if (address.town) parts.push(address.town);

        // Add city
        if (address.city) parts.push(address.city);
        else if (address.county) parts.push(address.county);

        // Add state
        if (address.state) parts.push(address.state);

        return parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        // Fallback to coordinates
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
};

/**
 * Main function: Get user's current location as a formatted string
 * @returns {Promise<string>} Location string like "Koramangala, Bangalore, Karnataka"
 */
export const getLocationString = async () => {
    const coords = await getCurrentPosition();
    const locationString = await reverseGeocode(coords.lat, coords.lng);
    return locationString;
};

export default {
    getCurrentPosition,
    reverseGeocode,
    getLocationString
};
