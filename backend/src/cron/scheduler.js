
const cron=require("node-cron");
const pool=require("../config/db");
const start=()=>{
cron.schedule("*/1 * * * *",async()=>{
await pool.query("UPDATE posts SET status='published' WHERE scheduled_at<=NOW() AND status='draft'");
});
};
module.exports=start;
