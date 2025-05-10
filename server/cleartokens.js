const admin = require('./firebaseAdmin');
const db = admin.firestore();

async function clearTokens() {
  try {
    const batch = db.batch();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    let count = 0;
    snapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmTokens) {
        batch.update(doc.ref, { fcmTokens: {} });
        count++;
      }
    });
    
    await batch.commit();
    console.log(`Cleared FCM tokens for ${count} users`);
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
}

clearTokens();