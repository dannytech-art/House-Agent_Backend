import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../data');
// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
function saveData(fileName, data) {
    fs.writeFileSync(path.join(dataDir, `${fileName}.json`), JSON.stringify(data, null, 2));
    console.log(`✅ Created ${fileName}.json with ${data.length} records`);
}
async function seed() {
    console.log('🌱 Seeding database...\n');
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash('demo123', 12);
    // Create demo users
    const users = [
        {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@demo.com',
            phone: '+234 800 000 0000',
            role: 'admin',
            passwordHash,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=D4AF37',
            createdAt: now,
            updatedAt: now,
            active: true,
        },
        {
            id: 'agent-demo',
            name: 'Demo Agent',
            email: 'agent@demo.com',
            phone: '+234 803 456 7890',
            role: 'agent',
            passwordHash,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoAgent&backgroundColor=D4AF37',
            agentType: 'direct',
            verified: true,
            kycStatus: 'verified',
            kycCompletedAt: now,
            level: 5,
            xp: 2500,
            credits: 150,
            walletBalance: 25000,
            streak: 7,
            totalListings: 12,
            totalInterests: 45,
            responseTime: 2.5,
            rating: 4.8,
            joinedDate: '2024-01-15',
            tier: 'market-dealer',
            badges: ['early-adopter', 'top-lister', 'deal-closer'],
            createdAt: now,
            updatedAt: now,
            active: true,
        },
        {
            id: 'seeker-demo',
            name: 'Demo Seeker',
            email: 'seeker@demo.com',
            phone: '+234 803 123 4567',
            role: 'seeker',
            passwordHash,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Seeker&backgroundColor=D4AF37',
            createdAt: now,
            updatedAt: now,
            active: true,
        },
    ];
    // Create sample properties
    const properties = [
        {
            id: 'prop-1',
            title: 'Luxury 4-Bedroom Duplex in Lekki Phase 1',
            type: 'duplex',
            price: 85000000,
            location: 'Lekki Phase 1, Lagos',
            area: 'Lekki',
            bedrooms: 4,
            bathrooms: 5,
            images: [
                'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
            ],
            amenities: ['Swimming Pool', 'Gym', '24/7 Security', 'Smart Home'],
            description: 'Stunning luxury duplex with modern finishes, located in the heart of Lekki Phase 1.',
            agentId: 'agent-demo',
            agentType: 'direct',
            agentName: 'Demo Agent',
            agentVerified: true,
            postedAt: now,
            featured: true,
            status: 'available',
            createdAt: now,
            updatedAt: now,
        },
        {
            id: 'prop-2',
            title: 'Modern 3-Bedroom Apartment in Victoria Island',
            type: 'apartment',
            price: 45000000,
            location: 'Victoria Island, Lagos',
            area: 'Victoria Island',
            bedrooms: 3,
            bathrooms: 3,
            images: [
                'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
                'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
            ],
            amenities: ['Elevator', 'Parking', '24/7 Power', 'Sea View'],
            description: 'Contemporary apartment with breathtaking ocean views in prime Victoria Island location.',
            agentId: 'agent-demo',
            agentType: 'direct',
            agentName: 'Demo Agent',
            agentVerified: true,
            postedAt: now,
            featured: true,
            status: 'available',
            createdAt: now,
            updatedAt: now,
        },
        {
            id: 'prop-3',
            title: 'Cozy Studio Apartment in Yaba',
            type: 'studio',
            price: 8500000,
            location: 'Yaba, Lagos',
            area: 'Yaba',
            bedrooms: 1,
            bathrooms: 1,
            images: [
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            ],
            amenities: ['Furnished', 'Internet Ready', 'Security'],
            description: 'Perfect starter apartment in the vibrant Yaba tech hub area.',
            agentId: 'agent-demo',
            agentType: 'direct',
            agentName: 'Demo Agent',
            agentVerified: true,
            postedAt: now,
            featured: false,
            status: 'available',
            createdAt: now,
            updatedAt: now,
        },
        {
            id: 'prop-4',
            title: 'Spacious 5-Bedroom House in Ikoyi',
            type: 'house',
            price: 150000000,
            location: 'Ikoyi, Lagos',
            area: 'Ikoyi',
            bedrooms: 5,
            bathrooms: 6,
            images: [
                'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
                'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
            ],
            amenities: ['Swimming Pool', 'Garden', 'Staff Quarters', 'CCTV', 'Smart Home'],
            description: 'Exclusive mansion in prestigious Ikoyi with world-class amenities.',
            agentId: 'agent-demo',
            agentType: 'direct',
            agentName: 'Demo Agent',
            agentVerified: true,
            postedAt: now,
            featured: true,
            status: 'available',
            createdAt: now,
            updatedAt: now,
        },
        {
            id: 'prop-5',
            title: 'Penthouse Suite in Eko Atlantic',
            type: 'penthouse',
            price: 250000000,
            location: 'Eko Atlantic, Lagos',
            area: 'Eko Atlantic',
            bedrooms: 4,
            bathrooms: 5,
            images: [
                'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800',
            ],
            amenities: ['Private Elevator', 'Rooftop Terrace', 'Ocean View', 'Concierge'],
            description: 'Ultra-luxury penthouse with panoramic ocean views in the new Eko Atlantic development.',
            agentId: 'agent-demo',
            agentType: 'direct',
            agentName: 'Demo Agent',
            agentVerified: true,
            postedAt: now,
            featured: true,
            status: 'available',
            createdAt: now,
            updatedAt: now,
        },
    ];
    // Create sample interests
    const interests = [
        {
            id: 'interest-1',
            propertyId: 'prop-1',
            seekerId: 'seeker-demo',
            seekerName: 'Demo Seeker',
            seekerPhone: '+234 803 123 4567',
            message: 'I am very interested in this property. Please contact me for a viewing.',
            seriousnessScore: 8,
            createdAt: now,
            unlocked: false,
            status: 'pending',
            updatedAt: now,
        },
        {
            id: 'interest-2',
            propertyId: 'prop-2',
            seekerId: 'seeker-demo',
            seekerName: 'Demo Seeker',
            seekerPhone: '+234 803 123 4567',
            message: 'Looking to move in ASAP. Budget is flexible.',
            seriousnessScore: 9,
            createdAt: now,
            unlocked: true,
            status: 'contacted',
            updatedAt: now,
        },
    ];
    // Create credit bundles
    const creditBundles = [
        { id: 'bundle-1', credits: 10, price: 1000, bonus: 0, active: true, createdAt: now },
        { id: 'bundle-2', credits: 25, price: 2000, bonus: 5, popular: true, active: true, createdAt: now },
        { id: 'bundle-3', credits: 50, price: 3500, bonus: 10, active: true, createdAt: now },
        { id: 'bundle-4', credits: 100, price: 6000, bonus: 25, active: true, createdAt: now },
    ];
    // Create sample quests
    const quests = [
        {
            id: 'quest-1',
            userId: 'agent-demo',
            title: 'Upload Your First Listing',
            description: 'Create and upload your first property listing',
            type: 'daily',
            progress: 1,
            target: 1,
            reward: { xp: 50, credits: 5 },
            completed: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            createdAt: now,
        },
        {
            id: 'quest-2',
            userId: 'agent-demo',
            title: 'Get 3 Interests',
            description: 'Receive 3 buyer interests on your listings',
            type: 'weekly',
            progress: 2,
            target: 3,
            reward: { xp: 100, credits: 10 },
            completed: false,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: now,
        },
    ];
    // Create sample challenges
    const challenges = [
        {
            id: 'challenge-1',
            agentId: 'agent-demo',
            title: 'Territory Expansion',
            description: 'Claim 2 new territories this week',
            type: 'collaboration',
            progress: 1,
            target: 2,
            reward: { xp: 200, credits: 20, badge: 'territory-master' },
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            completed: false,
            createdAt: now,
        },
    ];
    // Create sample territories
    const territories = [
        {
            id: 'territory-1',
            agentId: 'agent-demo',
            area: 'Lekki Phase 1',
            state: 'Lagos',
            dominance: 35,
            activeListings: 5,
            monthlyDeals: 2,
            rank: 3,
            dailyIncome: 50,
            claimedAt: now,
        },
        {
            id: 'territory-2',
            agentId: 'agent-demo',
            area: 'Victoria Island',
            state: 'Lagos',
            dominance: 20,
            activeListings: 3,
            monthlyDeals: 1,
            rank: 7,
            dailyIncome: 35,
            claimedAt: now,
        },
    ];
    // Create settings
    const settings = [
        { id: 's1', key: 'maintenance_mode', value: false, description: 'Enable maintenance mode', updatedAt: now },
        { id: 's2', key: 'max_listings_per_agent', value: 50, description: 'Maximum listings per agent', updatedAt: now },
        { id: 's3', key: 'interest_unlock_cost', value: 5, description: 'Credits to unlock an interest', updatedAt: now },
        { id: 's4', key: 'featured_listing_cost', value: 10, description: 'Credits to feature a listing', updatedAt: now },
    ];
    // Save all data
    saveData('users', users);
    saveData('properties', properties);
    saveData('interests', interests);
    saveData('credit_bundles', creditBundles);
    saveData('quests', quests);
    saveData('challenges', challenges);
    saveData('territories', territories);
    saveData('settings', settings);
    // Create empty files for other collections
    saveData('sessions', []);
    saveData('chat_sessions', []);
    saveData('chat_messages', []);
    saveData('transactions', []);
    saveData('notifications', []);
    saveData('groups', []);
    saveData('group_messages', []);
    saveData('badges', []);
    saveData('marketplace_offers', []);
    saveData('collaborations', []);
    saveData('kyc', []);
    saveData('flags', []);
    saveData('admin_actions', []);
    saveData('locations', []);
    saveData('analytics_events', []);
    saveData('reports', []);
    saveData('closable_deals', []);
    saveData('vilanow_tasks', []);
    saveData('risk_flags', []);
    saveData('automation_rules', []);
    saveData('notification_preferences', []);
    console.log('\n✨ Database seeded successfully!');
    console.log('\n📝 Demo Accounts:');
    console.log('   Email: admin@demo.com | Password: demo123 | Role: Admin');
    console.log('   Email: agent@demo.com | Password: demo123 | Role: Agent');
    console.log('   Email: seeker@demo.com | Password: demo123 | Role: Seeker');
}
seed().catch(console.error);
//# sourceMappingURL=seed.js.map