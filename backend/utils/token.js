const jwt=require("jsonwebtoken")

exports.generateAccessToken = (user) => {

  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      type: "access"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
      issuer: "blogging-platform",
      audience: "blog-users"
    }
  );
};

exports.generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      type: "refresh"
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
      issuer: "blogging-platform",
      audience: "blog-users"
    }
  );
};