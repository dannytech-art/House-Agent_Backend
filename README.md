# Vilanow Backend API

A robust Express.js backend for the Vilanow Real Estate Marketplace.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd backend
npm install
```

### Running the Server

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

### Seed Demo Data

```bash
npm run seed
```

This creates demo accounts:
- **Admin**: admin@demo.com / demo123
- **Agent**: agent@demo.com / demo123  
- **Seeker**: seeker@demo.com / demo123

## 📁 Project Structure

```
backend/
├── data/                 # JSON file storage (auto-created)
├── src/
│   ├── config/          # App configuration
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts      # JWT authentication
│   │   ├── errorHandler.ts
│   │   └── requestLogger.ts
│   ├── models/          # Data models (JSON file-based)
│   │   ├── User.ts
│   │   ├── Property.ts
│   │   ├── Interest.ts
│   │   ├── Chat.ts
│   │   ├── Credit.ts
│   │   └── ...
│   ├── routes/          # API route handlers
│   │   ├── auth.routes.ts
│   │   ├── property.routes.ts
│   │   ├── user.routes.ts
│   │   └── ...
│   ├── services/        # Business logic services
│   │   └── database.service.ts
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   │   └── seed.ts
│   └── index.ts         # App entry point
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/password-reset` - Request password reset
- `PATCH /api/auth/password-reset` - Reset password

### Properties
- `GET /api/properties` - List properties (with filters)
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property (agents only)
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property
- `GET /api/properties/my/listings` - Get agent's listings

### Interests
- `GET /api/interests` - List interests
- `POST /api/interests` - Express interest
- `PUT /api/interests/:id` - Update interest
- `POST /api/interests/:id/unlock` - Unlock interest (costs credits)

### Credits & Wallet
- `GET /api/credits/bundles` - Get available bundles
- `GET /api/credits/balance` - Get user balance
- `POST /api/credits/purchase` - Purchase credits
- `GET /api/credits/transactions` - Transaction history
- `POST /api/credits/wallet/load` - Load wallet

### Chat
- `GET /api/chats` - Get chat sessions
- `POST /api/chats` - Create chat session
- `GET /api/chats/:id/messages` - Get messages
- `POST /api/chats/:id/messages` - Send message

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id/messages` - Get group messages
- `POST /api/groups/:id/messages` - Send group message

### Gamification
- `GET /api/gamification/challenges` - Get challenges
- `GET /api/gamification/quests` - Get quests
- `GET /api/gamification/leaderboard` - Get leaderboard
- `GET /api/gamification/badges` - Get badges
- `GET /api/gamification/territories` - Get territories

### Territories
- `POST /api/territories/claim` - Claim territory
- `GET /api/territories/my` - Get my territories
- `GET /api/territories/locations` - Get locations

### Marketplace
- `GET /api/marketplace/offers` - Get offers
- `POST /api/marketplace/offers` - Create offer
- `POST /api/marketplace/offers/:id/purchase` - Purchase offer
- `GET /api/marketplace/collaborations` - Get collaborations

### Admin (admin only)
- `GET /api/admin/kyc/review` - Get pending KYC
- `POST /api/admin/kyc/review` - Review KYC
- `GET /api/admin/flags` - Get content flags
- `GET /api/admin/settings` - Get settings
- `POST /api/admin/settings` - Update settings
- `GET /api/admin/stats` - Dashboard stats

### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications` - Mark as read
- `DELETE /api/notifications` - Delete notifications

### Analytics (admin only)
- `GET /api/analytics/reports` - Get reports
- `POST /api/analytics/reports` - Generate report
- `GET /api/analytics/metrics` - Get metrics
- `POST /api/analytics/events` - Track event

### CIU System (admin only)
- `GET /api/ciu/deals` - Closable deals
- `GET /api/ciu/tasks` - Vilanow tasks
- `GET /api/ciu/risks` - Risk flags
- `GET /api/ciu/automation` - Automation rules

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## 🌐 CORS

CORS is configured to allow all origins (`*`) by default. This can be changed via the `CORS_ORIGIN` environment variable.

## 📝 Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

## 💾 Data Storage

This backend uses JSON files for data storage (located in `/data`). For production, consider migrating to a proper database like PostgreSQL or MongoDB.

## 🧪 Testing the API

Use the health endpoint to verify the server is running:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-30T12:00:00.000Z",
  "environment": "development"
}
```
