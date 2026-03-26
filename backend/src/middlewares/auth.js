const jwt = require("jsonwebtoken");

exports.authenticate = (req, res, next) => {
  const token = req.cookies.accessToken||req.cookies.refreshToken;
console.log(token,"token")
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};
exports.optionalAuth = (req, _res, next) => {
  try {
  const token = req.cookies.accessToken||req.cookies.refreshToken;
 console.log(token,"token coming")
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(decoded,"decoded")
      req.user = decoded;
    }
  } catch {
    // Expired / invalid token — treat as unauthenticated, don't block
    req.user = null;
  }
  next();
};