
const express=require("express");
const cors=require("cors");
const helmet=require("helmet");
const rateLimit=require("express-rate-limit");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.route");
const uploadRoutes = require("./routes/upload.route");
const postRoutes = require("./routes/post.routes");
const adminRoutes = require("./routes/admin.route");
require("dotenv").config();

const paymentRoutes = require("./routes/payment.route");
const revenueRoutes = require("./routes/revenue.route");
const categoryRoutes = require("./routes/category.routes");
const tagRoutes=require("./routes/Tag.routes")
const adminCommentsRoutes = require("./routes/adminCommentsRoutes");
const adminUsersRoutes = require("./routes/adminuserRoutes");
const adminSeoRoutes = require("./routes/adminSeoRoutes");
const walletRoutes = require("./routes/walletRoutes");
const payoutRoutes=require("./routes/payoutRoutes")
const creatorAnalyticsRoutes = require("./routes/creatorAnalyticsRoutes");
const subscriptionRoutes = require("./routes/subscription.routes");
const app=express();


app.use(cookieParser());


app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(helmet());
app.use(express.json());
app.use(rateLimit({windowMs:15*60*1000,max:200}));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tags",tagRoutes)
app.use("/api/payments", paymentRoutes);
app.use("/api/revenue", revenueRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/categories",categoryRoutes)
app.use("/api/comments", adminCommentsRoutes);
app.use("/api/adminuserRoutes",adminUsersRoutes)
app.use("/api/seoroutes", adminSeoRoutes);
app.use("/api/user", walletRoutes);
app.use("/api/payout", payoutRoutes);
app.use("/api/creatoranalytics", creatorAnalyticsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
// app.use("/api/social",require("./routes/social.routes"));
app.use("/api/analytics",require("./routes/analytics.routes"));

module.exports=app;
