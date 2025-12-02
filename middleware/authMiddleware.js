const jwt = require('jsonwebtoken');

// Helper function to extract token from request
const extractToken = (req) => {
    // Check Authorization header
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.replace('Bearer ', '');
    }
    
    // Check cookies
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    
    return null;
};

// Helper function to verify token and set user
const verifyAndSetUser = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

const authMiddleware = {
    // Required authentication
    required: (req, res, next) => {
        const token = extractToken(req);
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = verifyAndSetUser(token);
        if (!decoded) {
            return res.status(401).json({ message: 'Token is not valid' });
        }

        req.user = decoded;
        next();
    },

    // Optional authentication
    optional: (req, res, next) => {
        const token = extractToken(req);
        
        if (token) {
            const decoded = verifyAndSetUser(token);
            req.user = decoded;
        } else {
            req.user = null;
        }
        next();
    },

    // Admin only middleware
    isAdmin: (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        if (req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ 
                message: 'Access denied. Admin privileges required.' 
            });
        }
    },

    // Check if user is authenticated (returns true/false, doesn't block)
    isAuthenticated: (req) => {
        const token = extractToken(req);
        if (!token) return false;

        const decoded = verifyAndSetUser(token);
        if (decoded) {
            req.user = decoded;
            return true;
        }
        return false;
    },

    // Get user ID from token (helper function)
    getUserId: (req) => {
        const token = extractToken(req);
        if (!token) return null;

        const decoded = verifyAndSetUser(token);
        return decoded ? (decoded.id || decoded.userId || decoded._id) : null;
    }
};

module.exports = authMiddleware;