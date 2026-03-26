const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  generateAccessToken,
  generateRefreshToken
} = require("../../utils/token");
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/"
};
/* ================= REGISTER ================= */

exports.register = async (req, res) => {
  try {
    const username = req.body.username?.trim().toLowerCase();
const email = req.body.email?.trim().toLowerCase();
const { password, display_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All required fields are mandatory" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE email=$1 OR username=$2",
      [email, username]
    );

    if (existing.rows.length) {
      return res.status(400).json({ message: "Email or username already exists" });
    }

    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users(username,email,password,display_name)
       VALUES($1,$2,$3,$4)
       RETURNING id,username,email,role`,
      [username, email, hash, display_name || null]
    );

    const user = result.rows[0];

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("accessToken", accessToken, {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000
});

    res.cookie("refreshToken", refreshToken, {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000
});

    res.status(201).json(user);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= LOGIN ================= */

exports.login = async (req, res) => {
  
  try {
    
    const { email, password } = req.body;

    const result = await pool.query(
       "SELECT id,username,email,password,role,is_banned FROM users WHERE email=$1",
      [email]
    );

    if (!result.rows.length) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    if (user.is_banned) {
      return res.status(403).json({ message: "Account suspended" });
    }


    const valid = await bcrypt.compare(password, user.password);


    if (!valid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id=$1",
      [user.id]
    );

    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);

 res.cookie("accessToken", accessToken, {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000
});

   res.cookie("refreshToken", refreshToken, {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000
});

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

  } catch (err) {
    console.log(err,"err")
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= REFRESH TOKEN ================= */

exports.refreshToken = async(req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

 const result = await pool.query(
  "SELECT id, role FROM users WHERE id=$1",
  [decoded.id]
);

const user = result.rows[0];

const newAccessToken = generateAccessToken(user);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    res.json({ message: "Token refreshed" });

  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};


/* ================= LOGOUT ================= */

exports.logout = (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};


/* ================= ME ================= */

exports.me = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
  u.id,
  u.username,
  u.email,
  u.role,
  u.avatar,
  u.display_name,

  s.plan,
  s.expires_at,

  CASE 
    WHEN s.expires_at IS NOT NULL AND s.expires_at > NOW() THEN true
    ELSE false
  END AS is_subscribed

FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.id=$1`,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};