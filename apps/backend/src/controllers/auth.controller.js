import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { isMailConfigured, sendPasswordResetEmail } from '../services/mail.service.js';

const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000;

const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const getFrontendUrl = () => {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
};

const getPasswordResetPayload = (token, mailSent) => {
  const shouldReturnLink =
    process.env.RETURN_PASSWORD_RESET_LINK === 'true' ||
    (process.env.NODE_ENV !== 'production' && !mailSent);

  if (!shouldReturnLink) {
    return {};
  }

  return {
    resetToken: token,
    resetUrl: `${getFrontendUrl()}/reset-password?token=${token}`,
  };
};

/**
 * Controller for User Registration
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    console.log(`[Auth] Signup attempt: ${normalizedEmail}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.warn(`[Auth] Signup failed - user already exists: ${normalizedEmail}`);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email: normalizedEmail,
      passwordHash: password, // The model's pre-save hook will hash this
    });

    await user.save();

    // Generate JWT
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] Signup successful: ${normalizedEmail} (userId: ${user._id})`);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(`[Auth] Signup error for ${req.body?.email}:`, error.message);
    const message = error.name === 'MongooseError' || error.name === 'MongoNetworkError' 
      ? 'Database connection error. Please check your MongoDB URI and IP Whitelist.'
      : 'Error creating user';
    
    res.status(500).json({ 
      message, 
      error: error.message 
    });
  }
};

/**
 * Controller for User Login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    console.log(`[Auth] Login attempt: ${normalizedEmail}`);

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.warn(`[Auth] Login failed - user not found: ${normalizedEmail}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn(`[Auth] Login failed - incorrect password: ${normalizedEmail}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] Login successful: ${normalizedEmail} (userId: ${user._id})`);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(`[Auth] Login error for ${req.body?.email}:`, error.message);
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
};

/**
 * Create a password reset token and send it by email when SMTP is configured.
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const genericMessage = 'If an account exists for this email, a password reset link has been generated.';

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      console.warn(`[Auth] Password reset requested for unknown email: ${email}`);
      return res.json({ message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashResetToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
    await user.save();

    const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetToken}`;
    console.log(`[Auth] Password reset generated for ${user.email}`);

    let mailSent = false;
    if (isMailConfigured()) {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
      mailSent = true;
      console.log(`[Auth] Password reset email sent to ${user.email}`);
    } else if (process.env.NODE_ENV === 'production') {
      console.error('[Auth] SMTP is not configured; password reset email cannot be sent in production');
      return res.status(500).json({ message: 'Password reset email service is not configured' });
    }

    if (!mailSent || process.env.RETURN_PASSWORD_RESET_LINK === 'true') {
      console.log(`[Auth] Password reset link: ${resetUrl}`);
    }

    res.json({
      message: genericMessage,
      emailSent: mailSent,
      ...getPasswordResetPayload(resetToken, mailSent),
    });
  } catch (error) {
    console.error(`[Auth] Forgot password error for ${email}:`, error.message);
    res.status(500).json({ message: 'Error creating password reset link', error: error.message });
  }
};

/**
 * Consume a password reset token and set a new password.
 */
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const tokenHash = hashResetToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      console.warn('[Auth] Password reset failed - invalid or expired token');
      return res.status(400).json({ message: 'Password reset link is invalid or expired' });
    }

    user.passwordHash = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    console.log(`[Auth] Password reset successful for ${user.email}`);
    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    console.error('[Auth] Reset password error:', error.message);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

/**
 * Controller to get current user data
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      console.warn(`[Auth] GetMe - user not found: ${req.user.id}`);
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(`[Auth] GetMe error for userId ${req.user?.id}:`, error.message);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};
