
const express=require("express");
const r=express.Router();
const c=require("../controllers/analytics.controller");
r.get("/dashboard",c.dashboard);
module.exports=r;
