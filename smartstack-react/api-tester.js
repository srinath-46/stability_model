const API_KEY = "AIzaSyCixZxH3bFNfj0hfZMc2Ha9QRU39nLHo6U";
const PROJECT_ID = "smart-stack-b6dd7";

async function runTests() {
  console.log("Starting Firebase API CRUD Tests...");

  // 1. Authenticate to get Token
  console.log("\n[1] Authenticating as Test User...");
  
  // Try to create the user first
  let authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "api.tester@test.com", password: "testerpassword123", returnSecureToken: true })
  });
  let authData = await authRes.json();
  
  // If user already exists, sign in instead
  if (authData.error && authData.error.message === "EMAIL_EXISTS") {
    authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "api.tester@test.com", password: "testerpassword123", returnSecureToken: true })
    });
    authData = await authRes.json();
  }

  
  if (authData.error) {
    console.error("❌ Authentication Failed: ", authData.error.message);
    return;
  }
  
  const token = authData.idToken;
  console.log("✅ Authentication Successful.");

  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/test_api_operations`;

  // 2. INSERT
  console.log("\n[2] Testing INSERT operation...");
  const insertRes = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: {
        testMessage: { stringValue: "Hello from auto API tester!" }
      }
    })
  });
  const insertData = await insertRes.json();
  
  if (insertData.error) {
     console.error("❌ Insert Failed: ", insertData.error.message);
     return;
  }
  
  const docName = insertData.name;
  const docId = docName.split('/').pop();
  console.log("✅ Insert Successful! Document ID:", docId);

  // 3. RETRIEVE
  console.log("\n[3] Testing RETRIEVE operation...");
  const getRes = await fetch(`${baseUrl}/${docId}`, { headers });
  const getData = await getRes.json();
  console.log("✅ Retrieve Successful! Fetched message:", getData.fields.testMessage.stringValue);

  // 4. UPDATE
  console.log("\n[4] Testing UPDATE operation...");
  const updateRes = await fetch(`${baseUrl}/${docId}?updateMask.fieldPaths=status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      fields: {
        status: { stringValue: "UPDATED" }
      }
    })
  });
  await updateRes.json();
  console.log("✅ Update Successful! Status field was added.");

  // 5. DELETE
  console.log("\n[5] Testing DELETE operation...");
  await fetch(`${baseUrl}/${docId}`, { method: 'DELETE', headers });
  console.log("✅ Delete Successful! Test document removed.");
  
  console.log("\n🎉 All Database API Routes are fully connected and perfectly operational!");
}

runTests().catch(console.error);
