# System Architecture

## High-Level Architecture

```
┌─────────────┐
│   Citizen   │
│   Browser   │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────────────────────┐
│      React Frontend             │
│  - Report submission form       │
│  - Interactive map              │
│  - Status tracking dashboard    │
└──────────┬──────────────────────┘
           │ API calls
           ▼
┌─────────────────────────────────┐
│    Express.js Backend           │
│  - REST API endpoints           │
│  - Authentication (JWT)         │
│  - File upload handling         │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│    Agent Orchestrator           │
│  - Coordinates agent workflow   │
│  - Event-driven processing      │
└──────────┬──────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐    ┌────────────────┐
│ Agents │    │  Schedulers    │
└────────┘    └────────────────┘
    │              │
    └──────┬───────┘
           ▼
    ┌─────────────┐
    │  MongoDB    │
    └─────────────┘
```

## Data Flow

### 1. Report Submission Flow

```
User submits report
    ↓
Frontend validates input
    ↓
POST /api/reports/submit
    ↓
Save to DB (status: submitted)
    ↓
Trigger Intake Agent
    ↓
Intake Agent validates
    ↓
Assessment Agent analyzes
    ↓
Prioritization Agent assigns priority
    ↓
Communication Agent notifies user
```

### 2. Background Monitoring Flow

```
Cron job triggers (every 6 hours)
    ↓
Monitoring Agent checks deadlines
    ↓
Find overdue reports
    ↓
Escalate priority
    ↓
Notify authorities
    ↓
Update citizen status
```

## Agent Workflow Details

### Intake & Validation Agent

**Inputs**: Raw report data (image, location, metadata)
**Processing**:

- Validate image format and size
- Check location coordinates
- Filter spam/duplicates
  **Outputs**: Valid/Invalid status
  **Next**: If valid → Assessment Agent

### Damage Assessment Agent

**Inputs**: Validated report with image
**Processing**:

- Load pre-trained ML model
- Analyze image for pothole characteristics
- Classify damage type
- Estimate severity
  **Outputs**: severity, damageType, confidence
  **Next**: Prioritization Agent

### Prioritization Agent

**Inputs**: Assessed report with severity
**Processing**:

- Calculate priority score (0-100)
- Factors: severity, location, age, escalation
- Assign repair deadline
  **Outputs**: priority, deadline
  **Next**: Monitoring loop

### Monitoring & Escalation Agent

**Inputs**: All active reports
**Processing**:

- Check if deadline passed
- Increment escalation level
- Recalculate priority
  **Outputs**: Escalated reports
  **Next**: Communication Agent

### Communication Agent

**Inputs**: Report status changes
**Processing**:

- Generate notification message
- Send email/SMS based on preferences
  **Outputs**: Notifications sent

## Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  role: "citizen" | "admin" | "authority",
  notificationPreferences: {
    email: Boolean,
    sms: Boolean
  },
  createdAt: Date
}
```

### PotholeReport Collection

```javascript
{
  _id: ObjectId,
  reportId: String (unique),
  citizenId: ObjectId (ref: User),
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  imageUrl: String,
  status: "submitted" | "validated" | "assessed" |
          "prioritized" | "assigned" | "in-progress" |
          "completed" | "rejected",
  severity: "low" | "medium" | "high" | "critical",
  priority: Number (0-100),
  damageType: String,
  assignedTo: String,
  deadline: Date,
  escalationLevel: Number,
  rejectionReason: String,
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date,
  history: [{
    action: String,
    timestamp: Date,
    agentName: String,
    details: String
  }]
}
```

## API Security

- JWT-based authentication
- Token expiration: 24 hours
- Password hashing: bcrypt (10 rounds)
- File upload restrictions: 5MB max, images only
- CORS enabled for frontend origin

## Scalability Considerations

1. **Agent Processing**: Can be moved to separate microservices
2. **Image Storage**: Can use S3/Cloud Storage instead of local
3. **Background Jobs**: Can use Redis Queue/Bull for job management
4. **Database**: MongoDB sharding for large datasets
5. **Caching**: Redis for frequent queries

## Technology Justification

- **MongoDB**: Flexible schema for evolving report structure
- **Node.js**: Non-blocking I/O for agent coordination
- **React**: Component-based UI for reusability
- **JWT**: Stateless authentication for scalability
- **Leaflet**: Open-source map alternative to Google Maps
