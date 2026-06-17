import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Controller for User Registration
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log(`[Auth] Signup attempt: ${email}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn(`[Auth] Signup failed - user already exists: ${email}`);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      passwordHash: password, // The model's pre-save hook will hash this
    });

    await user.save();

    // Generate JWT
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] Signup successful: ${email} (userId: ${user._id})`);

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

    console.log(`[Auth] Login attempt: ${email}`);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.warn(`[Auth] Login failed - user not found: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn(`[Auth] Login failed - incorrect password: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] Login successful: ${email} (userId: ${user._id})`);

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
