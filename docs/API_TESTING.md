# API Testing Guide

## Base URL

```
http://localhost:3001
```

## Authentication Endpoints

### 1. Register New User

**POST** `/api/auth/register`

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "citizen"
}
```

**Response (201):**

```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen"
  }
}
```

**cURL Command:**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+1234567890"
  }'
```

---

### 2. Login User

**POST** `/api/auth/login`

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen"
  }
}
```

**cURL Command:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

### 3. Get User Profile

**GET** `/api/auth/profile`

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "citizen",
    "notificationPreferences": {
      "email": true,
      "sms": false
    }
  }
}
```

**cURL Command:**

```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### 4. Update Profile

**PATCH** `/api/auth/profile`

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "John Updated",
  "phone": "+9876543210",
  "notificationPreferences": {
    "email": true,
    "sms": true
  }
}
```

**cURL Command:**

```bash
curl -X PATCH http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Updated",
    "phone": "+9876543210"
  }'
```

---

### 5. Change Password

**POST** `/api/auth/change-password`

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

**cURL Command:**

```bash
curl -X POST http://localhost:3001/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword456"
  }'
```

---

## Report Endpoints

### 6. Submit Pothole Report

**POST** `/api/reports/submit`

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

- `image`: Image file (jpeg, jpg, png, gif, webp - max 5MB)
- `latitude`: Number (e.g., 40.7128)
- `longitude`: Number (e.g., -74.0060)
- `address`: String (optional)

**Response (201):**

```json
{
  "message": "Report submitted successfully",
  "report": {
    "reportId": "PR-1234567890-ABC123",
    "status": "submitted",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.006,
      "address": "Times Square, New York"
    },
    "imageUrl": "/uploads/pothole-1234567890-xyz.jpg",
    "createdAt": "2026-02-14T10:30:00.000Z"
  }
}
```

**cURL Command:**

```bash
curl -X POST http://localhost:3001/api/reports/submit \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "image=@/path/to/pothole-image.jpg" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -F "address=Times Square, New York"
```

---

### 7. Get My Reports

**GET** `/api/reports/my-reports?page=1&limit=10`

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response (200):**

```json
{
  "reports": [
    {
      "reportId": "PR-1234567890-ABC123",
      "status": "assessed",
      "severity": "high",
      "priority": 75,
      "location": {
        "latitude": 40.7128,
        "longitude": -74.006,
        "address": "Times Square, New York"
      },
      "imageUrl": "/uploads/pothole-1234567890-xyz.jpg",
      "createdAt": "2026-02-14T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

**cURL Command:**

```bash
curl -X GET "http://localhost:3001/api/reports/my-reports?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### 8. Get Specific Report

**GET** `/api/reports/:reportId`

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "report": {
    "reportId": "PR-1234567890-ABC123",
    "citizenId": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "status": "assessed",
    "severity": "high",
    "priority": 75,
    "damageType": "large_pothole",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.006,
      "address": "Times Square, New York"
    },
    "imageUrl": "/uploads/pothole-1234567890-xyz.jpg",
    "deadline": "2026-02-17T10:30:00.000Z",
    "createdAt": "2026-02-14T10:30:00.000Z",
    "history": [
      {
        "action": "Report submitted by citizen",
        "timestamp": "2026-02-14T10:30:00.000Z",
        "agentName": "System",
        "details": "Initial report submission"
      }
    ]
  }
}
```

**cURL Command:**

```bash
curl -X GET http://localhost:3001/api/reports/PR-1234567890-ABC123 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### 9. Get All Reports (Admin/Authority)

**GET** `/api/reports?page=1&limit=20&status=submitted&severity=high`

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (optional)
- `severity`: Filter by severity (optional)
- `priority`: Filter by priority level - 'high', 'medium', 'low' (optional)

**Response (200):**

```json
{
  "reports": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**cURL Command:**

```bash
curl -X GET "http://localhost:3001/api/reports?status=submitted&severity=high" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

---

### 10. Update Report Status (Admin/Authority)

**PATCH** `/api/reports/:reportId/status`

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "status": "in-progress",
  "assignedTo": "Repair Team A",
  "notes": "Assigned to team for immediate repair"
}
```

**Valid Status Values:**

- submitted
- validated
- assessed
- prioritized
- assigned
- in-progress
- completed
- rejected

**cURL Command:**

```bash
curl -X PATCH http://localhost:3001/api/reports/PR-1234567890-ABC123/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-progress",
    "assignedTo": "Repair Team A",
    "notes": "Started repair work"
  }'
```

---

### 11. Get Statistics (Admin/Authority)

**GET** `/api/reports/stats/overview`

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "total": 150,
  "critical": 12,
  "overdue": 5,
  "byStatus": [
    { "_id": "submitted", "count": 25 },
    { "_id": "in-progress", "count": 30 },
    { "_id": "completed", "count": 80 }
  ],
  "bySeverity": [
    { "_id": "critical", "count": 12 },
    { "_id": "high", "count": 35 },
    { "_id": "medium", "count": 50 },
    { "_id": "low", "count": 30 }
  ]
}
```

**cURL Command:**

```bash
curl -X GET http://localhost:3001/api/reports/stats/overview \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

---

### 12. Delete Report (Admin Only)

**DELETE** `/api/reports/:reportId`

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "message": "Report deleted successfully"
}
```

**cURL Command:**

```bash
curl -X DELETE http://localhost:3001/api/reports/PR-1234567890-ABC123 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Name, email, and password are required."
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token."
}
```

### 403 Forbidden

```json
{
  "error": "Access denied. Admin privileges required."
}
```

### 404 Not Found

```json
{
  "error": "Report not found."
}
```

### 500 Internal Server Error

```json
{
  "error": "Server error during registration."
}
```

---

## Testing Workflow

### 1. Create Test Users

```bash
# Create a citizen user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Citizen","email":"citizen@test.com","password":"test123"}'

# Create an admin user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@test.com","password":"admin123","role":"admin"}'
```

### 2. Save Tokens

After registration or login, save the returned token:

```bash
# For citizen
export CITIZEN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# For admin
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Test Report Submission

```bash
# Create a test image first or use an existing one
curl -X POST http://localhost:3001/api/reports/submit \
  -H "Authorization: Bearer $CITIZEN_TOKEN" \
  -F "image=@test-pothole.jpg" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -F "address=Test Location"
```

### 4. Test Report Retrieval

```bash
# Get my reports
curl -X GET http://localhost:3001/api/reports/my-reports \
  -H "Authorization: Bearer $CITIZEN_TOKEN"

# Get all reports (as admin)
curl -X GET http://localhost:3001/api/reports \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Postman Collection

You can import this API into Postman for easier testing. Create a new collection with these endpoints and use environment variables for:

- `baseUrl`: http://localhost:3001
- `citizenToken`: (set after login)
- `adminToken`: (set after admin login)
