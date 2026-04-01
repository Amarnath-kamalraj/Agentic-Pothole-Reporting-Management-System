# 🚀 Quick Start: Roboflow ML Integration

## What is Roboflow?

Roboflow is a computer vision platform with pre-trained models for object detection. They have **free pothole detection models** ready to use!

---

## ⚡ 5-Minute Setup

### Step 1: Create Roboflow Account (2 min)

1. Go to https://roboflow.com
2. Click "Sign Up" (free)
3. Verify email

### Step 2: Find a Pothole Model (1 min)

1. Go to **Roboflow Universe**: https://universe.roboflow.com
2. Search: **"pothole detection"** or **"road damage"**
3. Popular models:
   - "Pothole Detection" by @roboflow
   - "Road Damage Detection"
   - "Pavement Distress Classification"

### Step 3: Get API Credentials (1 min)

1. Click on a model
2. Click **"Use this Model"** or **"Deploy"**
3. You'll see:
   ```python
   # Example API endpoint shown:
   https://detect.roboflow.com/pothole-detector-abc123/1
   ?api_key=YOUR_API_KEY_HERE
   ```
4. Copy these details:
   - **API Key**: `YOUR_API_KEY_HERE`
   - **Workspace**: `pothole-detector-abc123` (before the `/`)
   - **Project**: `pothole-detector` (part of workspace)
   - **Version**: `1` (after the `/`)

### Step 4: Configure Your App (1 min)

```bash
# Open .env file
cd backend
nano .env

# Add these lines:
ROBOFLOW_API_KEY=paste_your_actual_key_here
ROBOFLOW_WORKSPACE=pothole-detector-abc123
ROBOFLOW_PROJECT=pothole-detector
ROBOFLOW_VERSION=1

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 5: Restart Server (30 sec)

```bash
# Kill old server
pkill -f "node.*server"

# Start new server
node server.js

# You should see:
# [ML Service] Initialized with provider: roboflow
# [Assessment Agent] Using ML provider: roboflow
# [Assessment Agent] Production mode: true
```

---

## ✅ Verify It's Working

### Check Server Logs

```bash
cd backend
tail -f server.log
```

Look for:

```
[ML Service] Initialized with provider: roboflow  ✅
[Assessment Agent] Production mode: true  ✅
```

### Submit a Test Report

```bash
curl -X POST http://localhost:3001/api/reports/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-pothole1.jpg" \
  -F "latitude=40.7580" \
  -F "longitude=-73.9855" \
  -F "address=Test Location"
```

### Check ML Analysis

```bash
tail -50 server.log | grep "Roboflow"
```

Should see:

```
[ML Service] Analyzing image with roboflow provider
[ML Service] Roboflow analysis: high severity, confidence: 89%
```

---

## 🎯 Free Tier Limits

**Roboflow Free Plan:**

- ✅ 1,000 predictions/month
- ✅ Unlimited projects
- ✅ Public models access
- ✅ No credit card required

**That's enough for:**

- ~33 reports per day
- ~250 reports per week
- Great for MVP and testing!

**If you exceed:**

- System auto-falls back to simulation
- No errors or crashes
- Logs will show: "Roboflow analysis failed: quota exceeded"

---

## 🔧 Troubleshooting

### Problem: Still seeing "simulation mode"

**Check 1**: Verify API key in .env

```bash
cat backend/.env | grep ROBOFLOW
```

**Check 2**: Restart server properly

```bash
pkill -f node
cd backend && node server.js
```

**Check 3**: Check for typos

- API key must not have spaces
- Workspace name must match exactly
- Version must be a number (usually 1)

### Problem: "Invalid API key" error

**Solution**:

1. Go to Roboflow dashboard
2. Settings → Roboflow API
3. Copy the key again (might have expired)
4. Update .env file
5. Restart server

### Problem: "Model not found" error

**Solution**:

- Verify workspace name is correct
- Check project name matches
- Ensure model version exists (try version "1")

---

## 🎨 Using Different Models

### Option 1: Use Public Universe Model

```bash
# Find any pothole model on Universe
# Example: "road-damage-5vnqv" project
ROBOFLOW_WORKSPACE=road-damage-5vnqv
ROBOFLOW_PROJECT=road-damage
ROBOFLOW_VERSION=2
```

### Option 2: Train Your Own Model

1. Create new project in Roboflow
2. Upload 50-100 pothole images
3. Annotate with bounding boxes
4. Train model (5-10 minutes)
5. Deploy and get API endpoint
6. Use your custom workspace/project names

---

## 💡 Best Practices

### 1. Image Quality

- Upload clear, well-lit images
- Minimum resolution: 640x480
- Avoid extreme angles

### 2. Monitoring Usage

- Check usage at: https://app.roboflow.com/settings/api
- Set up alerts before hitting limit
- Consider paid plan if needed

### 3. Error Handling

- System automatically falls back to simulation
- No disruption to users
- Check logs regularly

### 4. Caching (Future Enhancement)

- Cache results by image hash
- Avoid re-analyzing same images
- Save API credits

---

## 📞 Support

### Roboflow Support

- Docs: https://docs.roboflow.com
- Community: https://discuss.roboflow.com
- Email: support@roboflow.com

### Our System

- If ML fails → Automatic fallback to simulation
- Check logs: `tail -f backend/server.log`
- Report issues with specific Report IDs

---

## 🎉 That's It!

Your pothole detection system now uses **real computer vision ML**!

- ✅ No more simulation
- ✅ Real severity detection
- ✅ Bounding box coordinates
- ✅ High confidence scores
- ✅ Production-ready

**Next Steps:**

- Submit real pothole reports
- Monitor accuracy
- Adjust severity thresholds if needed
- Consider training custom model for your region

---

**Questions?**
Check [PHASE3_ML_ENHANCEMENT.md](PHASE3_ML_ENHANCEMENT.md) for detailed technical documentation.
