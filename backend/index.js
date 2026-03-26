
const app=require("./src/server");
const initTables=require("./src/tables/initTables");
const startScheduler=require("./src/cron/scheduler");

const PORT=process.env.PORT||5000;

(async()=>{
await initTables();
startScheduler();
app.listen(PORT,()=>console.log("BLOG BACKEND V5 COMPLETE RUNNING ON",PORT));
})();
