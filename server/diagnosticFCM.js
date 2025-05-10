// diagnosticFCM.js - A script to diagnose FCM token issues

const admin = require('./firebaseAdmin.js');

async function diagnoseFcmToken() {
  try {
    // Get Firebase project details
    const app = admin.app();
    console.log('\n===== FIREBASE PROJECT DETAILS =====');
    console.log('Project ID:', app.options.projectId);
    
    // Try to get service account details if possible
    if (app.options.credential && app.options.credential.projectId) {
      console.log('Service Account Project ID:', app.options.credential.projectId);
    }
    
    // Retrieve a sample token from your database
    const db = admin.firestore();
    const userId = 'UEgAg9pfVBeZquI9rQ7wYO3jpr73'; // Using the same user ID from your test
    
    console.log('\n===== USER TOKEN DETAILS =====');
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`No user found with ID: ${userId}`);
      return;
    }
    
    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];
    
    console.log(`Found ${tokens.length} token(s) for user ${userId}`);
    
    if (tokens.length > 0) {
      // For each token, perform a detailed analysis
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        console.log(`\nAnalyzing token ${i+1}:`, token.substring(0, 25) + '...');
        
        try {
          // Get information about the FCM token to determine its project/sender ID
          console.log('Attempting to analyze token details...');
          
          // This will help identify if token is associated with a different project
          try {
            // Try to send a minimal message to the token
            // If it succeeds, the token is valid for this project
            // If it fails with "SenderId mismatch", the token is from another project
            await admin.messaging().send({
              token: token,
              data: { test: 'test' } // Minimal payload
            });
            console.log('✅ Token is valid for this Firebase project!');
          } catch (error) {
            if (error.code === 'messaging/mismatched-credential' || 
                (error.message && error.message.includes('SenderId mismatch'))) {
              console.log('❌ SenderId mismatch detected. This token is from a different Firebase project.');
              
              // Try to extract more info from the token
              // FCM tokens usually have format: <sender_id>:<token_body>
              const parts = token.split(':');
              if (parts.length > 1) {
                console.log('Token sender ID part:', parts[0]);
                // This might help identify which project the token belongs to
              }
            } else if (error.code === 'messaging/invalid-registration-token' || 
                      error.code === 'messaging/registration-token-not-registered') {
              console.log('❌ Token is invalid or no longer registered.');
            } else {
              console.log('❌ Error testing token:', error.code, error.message);
            }
          }
        } catch (error) {
          console.error('Error analyzing token:', error);
        }
      }
    }
    
    console.log('\n===== SUGGESTIONS =====');
    console.log('1. Ensure all FCM tokens are generated from the same Firebase project as the server');
    console.log('2. Check if you have multiple Firebase projects that might be causing confusion');
    console.log('3. Verify your service account has proper permissions for FCM');
    console.log('4. Consider clearing invalid tokens and generating new ones');
    
  } catch (error) {
    console.error('Diagnostic error:', error);
  }
}

// Run the diagnosis
diagnoseFcmToken().then(() => {
  console.log('\nDiagnostic complete.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});