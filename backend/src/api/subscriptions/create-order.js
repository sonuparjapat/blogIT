const Razorpay = require("razorpay");
const crypto = require("crypto");
const pool = require("../config/db");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan } = req.body;

    const plans = {
      monthly: 19900, // ₹199
      yearly: 199900, // ₹1999
    };

    const amount = plans[plan];
    if (!amount) return res.status(400).json({ message: "Invalid plan" });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
    });

    await pool.query(
      `INSERT INTO payments (user_id, razorpay_order_id, amount)
       VALUES ($1, $2, $3)`,
      [userId, order.id, amount]
    );

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};