const crypto = require("crypto");
const pool = require("../config/db");

exports.verifyPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan
    } = req.body;

    // 🔐 Step 1: verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    // 🔥 START TRANSACTION
    await client.query("BEGIN");

    // 🔒 Step 2: lock payment row
    const { rows } = await client.query(
      `SELECT * FROM payments
       WHERE razorpay_order_id = $1
       FOR UPDATE`,
      [razorpay_order_id]
    );

    const payment = rows[0];
    if (!payment) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Payment not found" });
    }

    // 🛑 Step 3: idempotency check
    if (payment.status === "paid") {
      await client.query("COMMIT");
      return res.json({ success: true, message: "Already processed" });
    }

    // ✅ Step 4: update payment
    await client.query(
      `UPDATE payments
       SET status='paid',
           razorpay_payment_id=$1,
           razorpay_signature=$2
       WHERE id=$3`,
      [razorpay_payment_id, razorpay_signature, payment.id]
    );

    // 🧠 Step 5: calculate expiry
    const expiresQuery =
      plan === "yearly"
        ? "NOW() + INTERVAL '1 year'"
        : "NOW() + INTERVAL '1 month'";

    // 🔁 Step 6: upsert subscription (safe)
    await client.query(`
      INSERT INTO subscriptions (user_id, plan, started_at, expires_at)
      VALUES (${userId}, '${plan}', NOW(), ${expiresQuery})
      ON CONFLICT (user_id)
      DO UPDATE SET
        plan = EXCLUDED.plan,
        started_at = NOW(),
        expires_at = ${expiresQuery}
    `);

    // 💰 Step 7: revenue split
    const platformCut = payment.amount * 0.3;
    const creatorPool = payment.amount * 0.7;

    await client.query(
      `INSERT INTO platform_revenue (payment_id, total_amount, platform_cut, creator_pool)
       VALUES ($1,$2,$3,$4)`,
      [payment.id, payment.amount, platformCut, creatorPool]
    );

    // ✅ COMMIT (everything successful)
    await client.query("COMMIT");

    res.json({ success: true });

  } catch (err) {
    await client.query("ROLLBACK"); // 💥 rollback everything
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};