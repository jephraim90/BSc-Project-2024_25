// setup-env.js - Script to help set up the .env file
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if serviceAccountKey.json exists
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
let serviceAccount = null;

console.log('🔧 Setting up environment variables for the notification server');
console.log('------------------------------------------------------------');

const generateRandomString = (length = 32) => {
  return require('crypto').randomBytes(length).toString('hex');
};

const setupEnvironment = async () => {
  let projectId, clientEmail, privateKey;
  
  // Check if we can get info from serviceAccountKey.json
  if (fs.existsSync(serviceAccountPath)) {
    try {
      console.log('📁 Found serviceAccountKey.json, extracting information...');
      serviceAccount = require(serviceAccountPath);
      projectId = serviceAccount.project_id;
      clientEmail = serviceAccount.client_email;
      privateKey = serviceAccount.private_key;
      
      console.log(`✅ Successfully extracted information for project: ${projectId}`);
    } catch (error) {
      console.error('❌ Error reading serviceAccountKey.json:', error.message);
    }
  }
  
  // If we couldn't get info from the file, ask the user
  if (!projectId) {
    projectId = await askQuestion('Enter your Firebase project ID: ');
  }
  
  if (!clientEmail) {
    clientEmail = await askQuestion('Enter your Firebase client email (from serviceAccountKey.json): ');
  }
  
  if (!privateKey) {
    console.log('\n📝 For the private key, you need to copy it from your serviceAccountKey.json file.');
    console.log('   It should look like: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    privateKey = await askQuestion('Enter your Firebase private key: ');
  }
  
  // Generate random secrets
  const apiKeySecret = generateRandomString();
  const jwtSecret = generateRandomString();
  
  // Create .env file content
  const envContent = `# Server Configuration
PORT=5007
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=${projectId}
FIREBASE_CLIENT_EMAIL=${clientEmail}
FIREBASE_PRIVATE_KEY="${privateKey}"

# Security
API_KEY_SECRET=${apiKeySecret}
JWT_SECRET=${jwtSecret}

# Optional: Logging
LOG_LEVEL=info
`;

  // Write to .env file
  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envContent);
  
  console.log(`\n✅ .env file created successfully at: ${envPath}`);
  console.log('\n🔒 Security Notice:');
  console.log('   - Keep your .env file and serviceAccountKey.json secure');
  console.log('   - Never commit them to version control');
  console.log('   - Add both files to your .gitignore');
  
  console.log('\n🚀 Next steps:');
  console.log('   1. Start the server with: npm run dev');
  console.log('   2. Test the health endpoint: http://localhost:5007/health');
  console.log('   3. Update your client app to use the server');
  
  rl.close();
};

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

setupEnvironment();