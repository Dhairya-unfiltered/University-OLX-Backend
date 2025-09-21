const User = require("../models/User");
const OtpVerification = require("../models/OtpVerification");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const Banned = require("../models/Banned");
const crypto = require("crypto");


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });
};


exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();

    // NEW: check banned list
    const bannedEntry = await Banned.findOne({ email: normalizedEmail });
    if (bannedEntry) {
      return res.status(403).json({
        message: "This email is banned and cannot register.",
        reason: bannedEntry.reason || undefined,
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    let user;
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: "Email already in use" });
    }

    if (existingUser) {
      existingUser.name = name;
      existingUser.password = password;
      existingUser.isVerified = false;

      await existingUser.save();

      user = existingUser;
    } else {
      user = await User.create({
        name,
        email: normalizedEmail,
        password,
        hostelType: null,
        hostelBlock: null,
        isVerified: false,
      });
    }

    const otp = `${crypto.randomInt(100000, 999999)}`;

    let emaildata = {
      from: {
        name: "Campus Kart",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Verify your Email",
      html: `<p> Enter <b>${otp}</b> in the app to verify you email address.</p><p> This code Expires in <b>1 hour</b>.</p>`,
    };
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(otp, saltRounds);
    const OtpEntry = await OtpVerification.create({
      userId: user._id,
      otp: hashedOtp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    try {
      const info = await transporter.sendMail(emaildata);
    } catch (error) {
      console.log(error);
    }
     


    
    res.status(201).json({
      id: user._id,
      user,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error registering user", error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const user = await User.findOne({ email });

    if (!user.isVerified) {
      return res
        .status(400)
        .json({ message: "User not Verified, Please Reregister" });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      id: user._id,
      user,
      token: generateToken(user._id),
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error logging in user", error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User not found" });
  }

  if (!otp) {
    return res.status(400).json({ message: "Otp not provided" });
  }

  try {
    const otpRecords = await OtpVerification.find({ userId });
    if (otpRecords.length <= 0) {
      return res
        .status(400)
        .json({ message: "Account already verified or does not exist" });
    }

    const validOtps = otpRecords.filter(
      (record) => record.expiresAt > Date.now()
    );

    if (validOtps.length === 0) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const latestOtpRecord = validOtps.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest
    );

    const isMatch = await bcrypt.compare(otp, latestOtpRecord.otp);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await OtpVerification.deleteMany({ userId });

    await User.updateOne({ _id: userId }, { isVerified: true });

    const user = await User.findById(userId).select("-password");

    res.status(200).json({
      message: "User successfully verified",
      user,
      token: generateToken(user._id),
      userId: user._id,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error verifying user", error: err.message });
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching user info" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, hostelType, hostelBlock, mobileNumber } = req.body;

    let isProfileComplete;

    if (name && hostelType && hostelBlock && mobileNumber) {
      isProfileComplete = true;
    } else {
      isProfileComplete = false;
    }

    user.name = name || user.name;
    user.hostelType = hostelType || user.hostelType;
    user.hostelBlock = hostelBlock || user.hostelBlock;
    user.mobileNumber = mobileNumber || user.mobileNumber;
    user.isProfileComplete = isProfileComplete;
    user.updatedAt = new Date();

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating profile", error: err.message });
  }
};
