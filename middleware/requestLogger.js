// middleware/requestLogger.js
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);

  // Optional: Log request body (be careful with sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", JSON.stringify(req.body));
  }

  // Optional: Log query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    console.log("Query:", JSON.stringify(req.query));
  }

  next();
};

module.exports = requestLogger;
