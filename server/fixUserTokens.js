// fixUserTokens.js - Script to fix user FCM tokens for testing

const admin = require('./firebaseAdmin.js');
const db = admin.firestore();

// User ID to fix
const userId = process.argv[2] || 'UEgAg9pfVBeZquI9rQ7wYO3jpr73';

/**
 * Fix FCM tokens for a user
 */
async function fixUserTokens(userId) {
  try {
    console.log(`Fixing FCM tokens for user: ${userId}`);
    
    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error(`User ${userId} does not exist!`);
      return false;
    }
    
    const userData = userDoc.data();
    console.log(`Current user data:`, JSON.stringify({
      name: userData.name || 'N/A',
      email: userData.email || 'N/A',
      hasTokens: !!userData.fcmTokens,
      tokenCount: (userData.fcmTokens || []).length
    }, null, 2));
    
    // Clear existing tokens
    console.log('Clearing existing FCM tokens...');
    await db.collection('users').doc(userId).update({
      fcmTokens: []
    });
    
    // Add a test token for the current Firebase project
    // Format: test_TOKEN_PROJECT-ID
    const testToken = `test_token_${Date.now()}_${admin.app().options.projectId}`;
    
    console.log(`Adding test token: ${testToken}`);
    await db.collection('users').doc(userId).update({
      fcmTokens: admin.firestore.FieldValue.arrayUnion(testToken)
    });
    
    // Verify tokens were updated
    const updatedUser = await db.collection('users').doc(userId).get();
    const updatedTokens = updatedUser.data().fcmTokens || [];
    
    console.log(`Updated tokens:`, updatedTokens);
    console.log(`User now has ${updatedTokens.length} tokens`);
    
    return true;
  } catch (error) {
    console.error('Error fixing user tokens:', error);
    return false;
  }
}

// Run the fix
fixUserTokens(userId)
  .then(success => {
    console.log(success ? 'User tokens fixed successfully!' : 'Failed to fix user tokens.');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });