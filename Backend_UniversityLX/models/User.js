const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    hostelType: { type: String },
    hostelBlock: { type: String },
    mobileNumber: { type: String },
    isProfileComplete: { type: Boolean, default: false },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    password: { type: String, required: true },
    isVerified: { type: Boolean, required: true },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
