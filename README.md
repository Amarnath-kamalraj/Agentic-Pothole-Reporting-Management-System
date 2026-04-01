# Agentic Pothole Reporting and Management System

A web-based pothole reporting system that actively manages reported road damage using autonomous backend agents.

## Project Structure

```
pothole1/
├── backend/              # Node.js + Express backend
│   ├── agents/          # Autonomous agent implementations
│   ├── config/          # Configuration files
│   ├── jobs/            # Background job schedulers
│   ├── middleware/      # Express middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── uploads/         # Uploaded images storage
│   └── server.js        # Main server file
├── frontend/            # React frontend
│   └── src/
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── services/    # API service layer
│       └── utils/       # Utility functions
└── docs/                # Documentation
```

## Technologies Used

### Backend

- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Multer** for file uploads
- **Node-cron** for scheduled jobs
- **Nodemailer** for email notifications

### Frontend

- **React**
- **Axios** for API calls
- **React Router** for navigation
- **Leaflet/React-Leaflet** for map integration

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies (already done):

   ```bash
   npm install
   ```

3. Configure environment variables:
   - Edit `.env` file with your MongoDB URI and other settings
   - Change JWT_SECRET to a secure random string

4. Start MongoDB (if running locally):

   ```bash
   # macOS with Homebrew
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

5. Run the backend server:

   ```bash
   npm run dev    # Development mode with hot-reload
   npm start      # Production mode
   ```

   Server will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies (already done):

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm start
   ```

   Frontend will run on http://localhost:3000

## Agents Overview

1. **Intake & Validation Agent** - Validates uploaded images and location data
2. **Damage Assessment Agent** - Analyzes images to identify damage type and severity
3. **Prioritization Agent** - Assigns priority based on severity, location, and age
4. **Monitoring & Escalation Agent** - Tracks repair deadlines and escalates delays
5. **Citizen Communication Agent** - Sends automated status updates to citizens

## Development Phases

- ✅ **Phase 1**: Project setup and architecture (COMPLETED)
- 🔄 **Phase 2**: Backend API development (NEXT)
- ⏳ **Phase 3**: Agent system implementation
- ⏳ **Phase 4**: Frontend development
- ⏳ **Phase 5**: Integration & testing
- ⏳ **Phase 6**: Deployment

## Current Status

✅ Project structure created
✅ Backend initialized with all dependencies
✅ Frontend initialized with React
✅ Database models created
✅ Configuration files set up

**Next Steps**: Proceed to Phase 2 - Backend API Development

## API Endpoints (To be implemented)

### Authentication

- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - User login
- GET `/api/auth/profile` - Get user profile

### Reports

- POST `/api/reports/submit` - Submit new pothole report
- GET `/api/reports/:reportId` - Get specific report details
- GET `/api/reports/my-reports` - Get user's reports
- GET `/api/reports/all` - Get all reports (admin)
- PATCH `/api/reports/:reportId/status` - Update report status

## Notes

- The system uses pre-trained pothole detection models (to be integrated)
- Background jobs run every 6 hours for monitoring
- Priority recalculation happens daily at 2 AM

## License

ISC
