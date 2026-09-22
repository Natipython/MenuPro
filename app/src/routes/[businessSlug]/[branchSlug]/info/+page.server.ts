import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
    const { businessSlug, branchSlug } = params;

    // Mock data for Phase 2
    return {
        business: {
            name: 'Demo Cafe',
            slug: businessSlug,
            description: 'A cozy place for coffee and pastries.',
            contactEmail: 'hello@democafe.com',
            contactPhone: '+1 555-0192',
            website: 'https://democafe.com'
        },
        branch: {
            name: 'Main Branch',
            slug: branchSlug,
            address: '123 Main Street, Cityville',
            operatingHours: [
                { day: 'Monday', hours: '07:00 - 18:00' },
                { day: 'Tuesday', hours: '07:00 - 18:00' },
                { day: 'Wednesday', hours: '07:00 - 18:00' },
                { day: 'Thursday', hours: '07:00 - 18:00' },
                { day: 'Friday', hours: '07:00 - 20:00' },
                { day: 'Saturday', hours: '08:00 - 20:00' },
                { day: 'Sunday', hours: '08:00 - 15:00' }
            ],
            features: ['Dine-In', 'Takeaway', 'Free WiFi', 'Wheelchair Accessible']
        }
    };
};
