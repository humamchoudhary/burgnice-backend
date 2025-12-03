const jwt = require("jsonwebtoken");

// Helper function to extract token from request
const extractToken = (req) => {
  // Check Authorization header
  const authHeader = req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
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
    // console.log("req", req);
    const token = extractToken(req);

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = verifyAndSetUser(token);
    if (!decoded) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    req.user = decoded;
    next();
  },

  // Optional authentication
  optional: (req, res, next) => {
    const token = extractToken(req);
    console.log("Token:", token);

    if (token) {
      const decoded = verifyAndSetUser(token);
      console.log("Decoded user:", decoded);
      req.user = decoded;
    } else {
      req.user = null;
    }

    // Create a wrapper function to log what next() calls
    const originalNext = next;
    const patchedNext = (...args) => {
      console.log("=== NEXT() CALLED ===");
      console.log("Current route:", req.originalUrl);
      console.log("Current method:", req.method);
      console.log("Middleware stack position: next() called");

      // Get the function that will be called next
      const currentRoute = req.route;

      if (currentRoute) {
        console.log("Current route path:", currentRoute.path);
        console.log("Current route stack length:", currentRoute.stack.length);
      }

      // Log the middleware/controller that will be executed next
      // console.log("Stack length:", stack.length);

      originalNext(...args);
    };

    patchedNext();
  },

  // Admin only middleware
  isAdmin: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({
        message: "Access denied. Admin privileges required.",
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
    return decoded ? decoded.id || decoded.userId || decoded._id : null;
  },
};

module.exports = authMiddleware;
