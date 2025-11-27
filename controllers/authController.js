const User = require('../models/user');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const { username, email, password, profilePicture } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      const result = await User.register({
        username,
        email,
        password,
        profilePicture
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: result.user.UserID, 
          userType: 'User',
          username: result.user.Username,
          email: result.user.Email 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: result.user,
        token
      });
    } catch (error) {
      console.error('Register Controller Error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const result = await User.login(email, password);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: result.user.ID, 
          userType: result.user.UserType,
          username: result.user.Username,
          email: result.user.Email 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        user: result.user,
        token
      });
    } catch (error) {
      console.error('Login Controller Error:', error);
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      // This assumes you have auth middleware that adds user to req
      const user = await User.getUserById(req.user.userId, req.user.userType);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get Profile Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const { username, profilePicture } = req.body;
      
      const updatedUser = await User.updateProfile(
        req.user.userId, 
        req.user.userType, 
        { username, profilePicture }
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}



module.exports = AuthController;