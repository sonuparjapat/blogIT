const pool = require("../config/db");

/* ================= REQUEST PAYOUT ================= */
exports.requestPayout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    /* get wallet */
    const wallet = await pool.query(
      `SELECT total_earned, total_withdrawn
       FROM creator_wallets
       WHERE creator_id=$1`,
      [userId]
    );

    const data = wallet.rows[0];

    if (!data) {
      return res.status(400).json({ message: "No wallet found" });
    }

    const balance = data.total_earned - data.total_withdrawn;

    if (amount > balance) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    /* create payout request */
    await pool.query(
      `INSERT INTO payout_requests(creator_id, amount)
       VALUES($1,$2)`,
      [userId, amount]
    );

    res.json({ message: "Payout request submitted" });

  } catch (err) {
    console.log(err,"error")
    res.status(500).json({ message: "Payout error" });
  }
};


/* ================= GET MY PAYOUT REQUESTS ================= */
exports.getMyPayouts = async (req, res) => {
  try {
    const data = await pool.query(
      `SELECT * FROM payout_requests
       WHERE creator_id=$1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(data.rows);

  } catch (err) {
    console.log(err,"errocoming")
    res.status(500).json({ message: "Error fetching payouts" });
  }
};

/* ================= ADMIN: GET ALL REQUESTS ================= */
exports.getAllPayouts = async (req, res) => {
  try {
    const data = await pool.query(`
      SELECT pr.*, u.username
      FROM payout_requests pr
      JOIN users u ON pr.creator_id = u.id
      ORDER BY pr.created_at DESC
    `);

    res.json(data.rows);

  } catch (err) {
    res.status(500).json({ message: "Error fetching payouts" });
  }
};


/* ================= ADMIN: APPROVE ================= */
exports.approvePayout = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const payout = await client.query(
      `SELECT * FROM payout_requests WHERE id=$1 FOR UPDATE`,
      [id]
    );

    if (!payout.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Not found" });
    }

    const reqData = payout.rows[0];

    if (reqData.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Already processed" });
    }

    /* update wallet */
    await client.query(
      `
      UPDATE creator_wallets
      SET total_withdrawn = total_withdrawn + $1,
          updated_at = NOW()
      WHERE creator_id = $2
      `,
      [reqData.amount, reqData.creator_id]
    );

    /* mark paid */
    await client.query(
      `
      UPDATE payout_requests
      SET status='paid', processed_at=NOW()
      WHERE id=$1
      `,
      [id]
    );

    await client.query("COMMIT");

    res.json({ message: "Payout approved & paid" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Approval failed" });
  } finally {
    client.release();
  }
};


/* ================= ADMIN: REJECT ================= */
exports.rejectPayout = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE payout_requests
       SET status='rejected', processed_at=NOW()
       WHERE id=$1`,
      [id]
    );

    res.json({ message: "Payout rejected" });

  } catch (err) {
    res.status(500).json({ message: "Reject failed" });
  }
};