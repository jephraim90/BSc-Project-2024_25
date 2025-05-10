// middleware/auth.js - Authentication middleware with development testing option

const admin = require('firebase-admin');

/**
 * Middleware to authenticate requests using Firebase Auth
 * Expects a Bearer token in the Authorization header
 */
module.exports = async (req, res, next) => {
  try {
    // DEVELOPMENT ONLY: Testing bypass
    // This allows bypassing authentication during development
    if (process.env.NODE_ENV === 'development' && 
        req.headers['x-test-auth'] === 'development-testing-only') {
      
      console.log('⚠️ DEVELOPMENT MODE: Authentication bypassed for testing');
      
      req.user = {
        uid: req.headers['x-test-uid'] || 'test-user-123',
        email: 'test@example.com',
        role: req.headers['x-test-role'] || 'user',
        isAdmin: req.headers['x-test-role'] === 'admin'
      };
      
      return next();
    }
    
    // Normal authentication flow
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No valid authentication token provided'
      });
    }
    
    // Extract token
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token format'
      });
    }
    
    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (!decodedToken.uid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }
    
    // Get additional user data from Firestore
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    
    // Set user data in request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false
    };
    
    // Add user role if available
    if (userDoc.exists) {
      const userData = userDoc.data();
      req.user.role = userData.role || 'user';
      req.user.isAdmin = userData.role === 'admin';
    } else {
      req.user.role = 'user';
      req.user.isAdmin = false;
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Authentication failed',
      message: error.message
    });
  }
};