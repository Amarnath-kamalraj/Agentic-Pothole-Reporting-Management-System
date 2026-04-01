const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// Tamil Nadu locations (various cities)
const tamilNaduLocations = [
  { name: "Chennai - Anna Nagar", lat: 13.085, lon: 80.2101 },
  { name: "Chennai - T Nagar", lat: 13.0418, lon: 80.2341 },
  { name: "Coimbatore - RS Puram", lat: 11.0168, lon: 76.9558 },
  { name: "Madurai - Anna Nagar", lat: 9.9252, lon: 78.1198 },
  { name: "Trichy - Cantonment", lat: 10.8155, lon: 78.6869 },
  { name: "Salem - Five Roads", lat: 11.6643, lon: 78.146 },
  { name: "Tirunelveli - Palayamkottai", lat: 8.7139, lon: 77.7567 },
  { name: "Erode - Perundurai Road", lat: 11.341, lon: 77.7172 },
  { name: "Vellore - Gandhi Nagar", lat: 12.9165, lon: 79.1325 },
  { name: "Tiruppur - Kangeyam Road", lat: 11.1085, lon: 77.3411 },
];

const BASE_URL = "http://localhost:3001/api";

const registerAndAddReports = async (email, password) => {
  try {
    console.log("Step 1: Registering new user...");

    // Register user
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: "Tamil Nadu Citizen",
      email: email,
      password: password,
      phone: "9876543210",
    });

    const token = registerRes.data.token;
    console.log(`✓ User registered: ${email}`);

    console.log("\nStep 2: Adding 10 pothole reports in Tamil Nadu...\n");

    // Add 10 reports
    for (let i = 0; i < 10; i++) {
      const location = tamilNaduLocations[i];
      const imagePath =
        i % 2 === 0
          ? path.join(__dirname, "../test-pothole1.jpg")
          : path.join(__dirname, "../test-pothole2.jpg");

      const form = new FormData();
      form.append("image", fs.createReadStream(imagePath));
      form.append("latitude", location.lat.toString());
      form.append("longitude", location.lon.toString());
      form.append("address", location.name);
      form.append(
        "description",
        `Pothole reported in ${location.name}, Tamil Nadu`,
      );

      const reportRes = await axios.post(`${BASE_URL}/reports/submit`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(
        `✓ Report ${i + 1}/10: ${reportRes.data.reportId} - ${location.name}`,
      );

      // Wait a bit to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("\n✓ All 10 reports added successfully!");
    console.log("\nYou can now:");
    console.log(`- Login with: ${email}`);
    console.log("- View reports at: http://localhost:3000/my-reports");
    console.log("- View map at: http://localhost:3000/map");
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    process.exit(1);
  }
};

// Get email and password from command line
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log("Usage: node addTamilNaduReports.js <email> <password>");
  console.log("Example: node addTamilNaduReports.js tn@test.com password123");
  process.exit(1);
}

registerAndAddReports(email, password);
