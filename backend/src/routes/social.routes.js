
const express=require("express");
const auth=require("../middlewares/auth");
const c=require("../controllers/social.controller");
const r=express.Router();
r.post("/like/:postId",auth,c.toggleLike);
r.post("/bookmark/:postId",auth,c.toggleBookmark);
r.post("/follow/:userId",auth,c.follow);
module.exports=r;
