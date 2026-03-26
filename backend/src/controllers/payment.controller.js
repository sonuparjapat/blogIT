const pool = require("../config/db");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

const revenueController = require("./revenue.controller");

/* ================= CREATE ORDER ================= */

exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    let amount;

    if (plan === "monthly") amount = 19900; // ₹199
    else if (plan === "yearly") amount = 199900; // ₹1999
    else return res.status(400).json({ message: "Invalid plan" });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

  await pool.query(
  `INSERT INTO payments(user_id, razorpay_order_id, amount, status)
   VALUES($1,$2,$3,'created')`,
  [req.user.id, order.id, amount]
);

    res.json(order);

  } catch (err) {
    res.status(500).json({ message: "Order creation failed" });
  }
};


/* ================= VERIFY PAYMENT (FRONTEND FLOW) ================= */

exports.verifyPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    await client.query("BEGIN");

    /* ================= LOCK PAYMENT ROW ================= */

    const paymentResult = await client.query(
      `SELECT * FROM payments
       WHERE razorpay_order_id=$1
       FOR UPDATE`,
      [razorpay_order_id]
    );

    if (!paymentResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Payment not found" });
    }

    const payment = paymentResult.rows[0];

    /* ================= IDEMPOTENCY CHECK ================= */

    if (payment.status === "paid") {
      await client.query("ROLLBACK");
      return res.json({ message: "Already processed" });
    }

    /* ================= VERIFY SIGNATURE ================= */

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid signature" });
    }

    /* ================= VERIFY AMOUNT ================= */

    const expectedAmount = payment.amount;

    if (!expectedAmount || expectedAmount <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    /* ================= MARK PAYMENT PAID ================= */

    const updateResult = await client.query(
      `UPDATE payments
       SET razorpay_payment_id=$1,
           razorpay_signature=$2,
           status='paid'
       WHERE razorpay_order_id=$3
       RETURNING id, user_id, amount`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    const updatedPayment = updateResult.rows[0];

    /* ================= DETERMINE PLAN FROM AMOUNT ================= */

    let plan;
    let intervalQuery;

    if (updatedPayment.amount === 19900) {
      plan = "monthly";
      intervalQuery = "NOW() + INTERVAL '30 days'";
    } else if (updatedPayment.amount === 199900) {
      plan = "yearly";
      intervalQuery = "NOW() + INTERVAL '365 days'";
    } else {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Amount does not match any plan" });
    }

    /* ================= UPSERT SUBSCRIPTION ================= */

    await client.query(
      `
    INSERT INTO subscriptions(user_id, plan, started_at, expires_at)
VALUES($1,$2,NOW(), ${intervalQuery})
ON CONFLICT (user_id)
DO UPDATE SET
  plan = EXCLUDED.plan,
  started_at = NOW(),
  expires_at = 
    CASE 
      WHEN subscriptions.expires_at > NOW() 
      THEN subscriptions.expires_at + (${intervalQuery} - NOW())
      ELSE ${intervalQuery}
    END
      `,
      [updatedPayment.user_id, plan]
    );

    /* ================= DISTRIBUTE REVENUE ================= */

    await revenueController.distributeRevenue(updatedPayment.id);

    await client.query("COMMIT");

    res.json({
      message: "Payment verified & subscription activated",
      plan
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Payment verification error:", err);
    res.status(500).json({ message: "Verification failed" });
  } finally {
    client.release();
  }
};


/* ================= RAZORPAY WEBHOOK (REAL PRODUCTION METHOD) ================= */

exports.webhookHandler = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const signature = req.headers["x-razorpay-signature"];

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const event = req.body;

  // Prevent duplicate webhook processing
  const existing = await pool.query(
    `SELECT id FROM webhook_events WHERE event_id=$1`,
    [event.id]
  );

  if (existing.rows.length) {
    return res.json({ message: "Webhook already processed" });
  }

  await pool.query(
    `INSERT INTO webhook_events(event_id) VALUES($1)`,
    [event.id]
  );

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;

    await pool.query(
      `UPDATE payments
       SET status='paid',
           razorpay_payment_id=$1
       WHERE razorpay_order_id=$2`,
      [payment.id, payment.order_id]
    );
  }

  res.json({ message: "Webhook processed" });
};