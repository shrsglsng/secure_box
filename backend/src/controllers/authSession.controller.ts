import crypto from "crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { User } from "../models/User.model.js";
import { Otp } from "../models/Otp.model.js";
import { LockerRequest } from "../models/LockerRequest.model.js";
import { smsService } from "../services/sms.service.js";
import { TokenService } from "../services/token.service.js";
import { verifyPassword, hashPassword } from "../utils/password.js";
import { config } from "../config.js";

async function syncResolvedUnits(user: any): Promise<number> {
  const reqs = await LockerRequest.find({ userId: user._id, status: { $ne: "rejected" } }).lean();
  const total = reqs.reduce((sum: number, r: any) => sum + (r.units || 1), 0);
  const resolved = Math.max(total, user.assignedDevices?.length || 0);
  if (user.units !== resolved) {
    user.units = resolved;
    await user.save();
  }
  return resolved;
}

// 1. User Login (with Argon2id & legacy bcrypt auto-upgrade)
export async function login(request: FastifyRequest, reply: FastifyReply) {
  const loginSchema = z.object({
    identifier: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(1, "Password is required"),
  });

  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: parsed.error.issues[0]?.message || "Invalid login payload",
    });
  }

  const { password, identifier, phone, email } = parsed.data;
  const idString = (phone || email || identifier || "").trim();
  if (!idString) {
    return reply.status(400).send({ error: "Mobile number or email is required" });
  }

  const cleanPhone = smsService.normalizePhone(idString);
  const queryConditions: Array<{ phone: string } | { email: string }> = [];
  if (cleanPhone) {
    queryConditions.push({ phone: cleanPhone });
  }
  queryConditions.push({ email: idString.toLowerCase() });

  // Explicitly select password since User model has select: false for zero-leak security
  const user = await User.findOne({ $or: queryConditions }).select("+password");
  if (!user) {
    return reply.status(401).send({ error: "Invalid mobile number/email or password" });
  }

  // Account Lockout / Exponential Backoff Check
  if (user.lockUntil && user.lockUntil > new Date()) {
    const waitSeconds = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
    return reply.status(429).send({
      error: `Too many failed login attempts. Account temporarily locked. Please wait ${waitSeconds} seconds before trying again.`,
      lockoutRemaining: waitSeconds,
    });
  }

  // Verify using Argon2id with automatic legacy bcrypt support
  const { valid: isMatch, needsRehash } = await verifyPassword(password, user.password);

  if (!isMatch) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    user.failedLoginAttempts = attempts;

    // Exponential backoff locks:
    // 5 failed attempts -> 1 minute lockout
    // 10 failed attempts -> 15 minutes lockout
    // 15+ failed attempts -> 60 minutes lockout
    if (attempts >= 15) {
      user.lockUntil = new Date(Date.now() + 60 * 60 * 1000);
    } else if (attempts >= 10) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    } else if (attempts >= 5) {
      user.lockUntil = new Date(Date.now() + 60 * 1000);
    }

    await user.save();
    return reply.status(401).send({ error: "Invalid mobile number/email or password" });
  }

  // If user authenticated with legacy bcrypt, seamlessly upgrade hash to Argon2id in background
  if (needsRehash) {
    user.password = await hashPassword(password);
  }

  // On successful login, reset failed attempts and lockout
  if (user.failedLoginAttempts || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
  }
  await user.save();

  const token = request.server.jwt.sign({
    id: user._id,
    phone: user.phone,
    email: user.email,
    role: user.role,
  });

  const refreshToken = await TokenService.createRefreshToken(user._id);

  const resolvedUnits = await syncResolvedUnits(user);

  const latestRequest = await LockerRequest.findOne({ userId: user._id }).sort({ createdAt: -1 });

  return reply.send({
    success: true,
    user: {
      id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      address: user.address,
      pincode: user.pincode,
      units: resolvedUnits,
      orderStatus: latestRequest?.status || user.orderStatus,
      assignedDevices: latestRequest?.assignedDeviceIds || user.assignedDevices || [],
    },
    token,
    refreshToken,
  });
}

// 2. Current Authenticated Profile
export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const authUser = request.user as { id: string };
  if (!authUser?.id) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const user = await User.findById(authUser.id);
  if (!user) {
    return reply.status(401).send({ error: "User session expired or user not found. Please log in again." });
  }

  const resolvedUnits = await syncResolvedUnits(user);

  const latestRequest = await LockerRequest.findOne({ userId: user._id }).sort({ createdAt: -1 });

  return reply.send({
    user: {
      id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      address: user.address,
      pincode: user.pincode,
      units: resolvedUnits,
      orderStatus: latestRequest?.status || user.orderStatus,
      assignedDevices: latestRequest?.assignedDeviceIds || user.assignedDevices || [],
      requestDetails: latestRequest
        ? {
            id: latestRequest._id,
            status: latestRequest.status,
            rejectionReason: latestRequest.rejectionReason,
            units: latestRequest.units,
            createdAt: latestRequest.createdAt,
          }
        : null,
    },
  });
}

// 3. Update User Profile (Name, Email)
export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  const authUser = request.user as { id: string };
  if (!authUser?.id) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const { name, email } = (request.body as { name?: string; email?: string }) || {};

  const user = await User.findById(authUser.id);
  if (!user) {
    return reply.status(404).send({ error: "User not found" });
  }

  if (name !== undefined) {
    const cleanName = name.trim();
    if (!cleanName) {
      return reply.status(400).send({ error: "Name cannot be empty" });
    }
    user.name = cleanName;
  }

  if (email !== undefined) {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return reply.status(400).send({ error: "Please enter a valid email address" });
      }
      const existing = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (existing) {
        return reply.status(409).send({ error: "This email address is already in use" });
      }
      user.email = cleanEmail;
    } else {
      user.email = undefined;
    }
  }

  await user.save();

  return reply.send({
    success: true,
    message: "Profile updated successfully",
    user: {
      id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      address: user.address,
      pincode: user.pincode,
      units: user.units,
      orderStatus: user.orderStatus,
      assignedDevices: user.assignedDevices || [],
    },
  });
}

// 4. Refresh Access Token with Token Rotation
export async function refreshTokenHandler(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = (request.body as { refreshToken?: string }) || {};

  if (!refreshToken) {
    return reply.status(400).send({ error: "Refresh token is required" });
  }

  const rotationResult = await TokenService.rotateRefreshToken(refreshToken);
  if (!rotationResult) {
    return reply.status(401).send({ error: "Invalid or expired refresh token. Please sign in again." });
  }

  const user = await User.findById(rotationResult.userId);
  if (!user) {
    return reply.status(401).send({ error: "User associated with token no longer exists" });
  }

  const token = request.server.jwt.sign({
    id: user._id,
    phone: user.phone,
    email: user.email,
    role: user.role,
  });

  return reply.send({
    success: true,
    token,
    refreshToken: rotationResult.newRefreshToken,
  });
}

// 5. Logout & Revoke Refresh Token
export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = (request.body as { refreshToken?: string }) || {};

  if (refreshToken) {
    await TokenService.revokeToken(refreshToken);
  }

  return reply.send({
    success: true,
    message: "Logged out successfully",
  });
}

// 6. Reset Password via Mobile OTP Verification
export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const { phone, otp, newPassword } = request.body as {
    phone?: string;
    otp?: string;
    newPassword?: string;
  };

  if (!phone || !otp || !newPassword) {
    return reply.status(400).send({ error: "phone, otp, and newPassword are required" });
  }

  if (newPassword.length < 6 || newPassword.length > 12) {
    return reply.status(400).send({ error: "New password must be between 6 and 12 characters long" });
  }

  const cleanPhone = smsService.normalizePhone(phone);
  if (!cleanPhone) {
    return reply.status(400).send({ error: "Invalid mobile number format" });
  }

  const user = await User.findOne({ phone: cleanPhone });
  if (!user) {
    return reply.status(404).send({ error: "No account found registered with this mobile number" });
  }

  const isDemoBypass = config.demoMode && (otp.trim() === "123456" || otp.trim() === "000000");

  const otpRecord = await Otp.findOne({
    phone: cleanPhone,
    verified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (otpRecord) {
    const candBuf = Buffer.from(crypto.createHash("sha256").update(otp.trim()).digest("hex"), "utf8");
    const storedBuf = Buffer.from(otpRecord.otp, "utf8");
    const isHashMatch = candBuf.length === storedBuf.length && crypto.timingSafeEqual(candBuf, storedBuf);

    if (!isHashMatch && !isDemoBypass) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 3) {
        await Otp.deleteOne({ _id: otpRecord._id });
        return reply.status(400).send({ error: "Maximum incorrect OTP attempts exceeded. Please request a new OTP." });
      }
      await otpRecord.save();
      return reply.status(400).send({ error: "Incorrect OTP. Please try again." });
    }

    otpRecord.verified = true;
    await Otp.deleteOne({ _id: otpRecord._id });
  } else if (!isDemoBypass) {
    return reply.status(400).send({ error: "Invalid or expired OTP. Please request a new one." });
  }

  // Hash new password using Argon2id
  user.password = await hashPassword(newPassword);
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // Revoke all existing refresh tokens for security
  await TokenService.revokeAllUserTokens(user._id);

  return reply.send({
    success: true,
    message: "Password reset successfully. Please sign in with your new password.",
  });
}
