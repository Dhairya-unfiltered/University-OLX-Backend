const express = require("express");
const {
  registerUser,
  loginUser,
  getUserInfo,
  updateProfile,
  verifyOtp,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/getUser", protect, getUserInfo);
router.post("/verify", verifyOtp);
router.post("/updateProfile", protect, updateProfile);

module.exports = router;
