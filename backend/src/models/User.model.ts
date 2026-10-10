import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  phone?: string;
  email?: string;
  name?: string;
  password: string;
  role: "user" | "admin";
  isPhoneVerified: boolean;
  isDemo: boolean;
  address?: string;
  pincode?: string;
  units?: number;
  orderStatus?: "pending" | "preparing" | "dispatched" | "delivered" | "approved" | "rejected";
  assignedDevices?: string[];
  failedLoginAttempts?: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    units: {
      type: Number,
      default: 0,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "preparing", "dispatched", "delivered", "approved", "rejected"],
    },
    assignedDevices: [
      {
        type: String,
        trim: true,
      },
    ],
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);
