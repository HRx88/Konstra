const sql = require('mssql');
const dbConfig = require('../dbConfig');
const bcrypt = require('bcrypt');

class User {
  // Register new user
  static async register(userData) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      // Check if user already exists
      const existingUser = await pool.request()
        .input('email', sql.NVarChar, userData.email)
        .query(`
          SELECT UserID FROM Users WHERE Email = @email
          UNION ALL
          SELECT AdminID as UserID FROM Admins WHERE Email = @email
        `);

      if (existingUser.recordset.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Check if username exists
      const existingUsername = await pool.request()
        .input('username', sql.NVarChar, userData.username)
        .query(`
          SELECT UserID FROM Users WHERE Username = @username
          UNION ALL
          SELECT AdminID as UserID FROM Admins WHERE Username = @username
        `);

      if (existingUsername.recordset.length > 0) {
        throw new Error('Username already taken');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Insert new user
      const result = await pool.request()
        .input('username', sql.NVarChar, userData.username)
        .input('email', sql.NVarChar, userData.email)
        .input('password', sql.NVarChar, hashedPassword)
        .input('profilePicture', sql.NVarChar, userData.profilePicture || null)
        .query(`
          INSERT INTO Users (Username, Email, Password, ProfilePicture, Role, CreatedAt)
          OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.ProfilePicture, INSERTED.Role
          VALUES (@username, @email, @password, @profilePicture, 'User', GETDATE())
        `);

      return {
        success: true,
        user: result.recordset[0]
      };
    } catch (err) {
      console.error('Registration Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }
  /*  // Login user
    static async login(email, password) {
      let pool;
      try {
        pool = await sql.connect(dbConfig);
        
        // Check in both Users and Admins tables
        const result = await pool.request()
          .input('email', sql.NVarChar, email)
          .query(`
            SELECT 
              'User' as UserType,
              UserID as ID,
              Username,
              Email,
              Password,
              ProfilePicture,
              Role,
              IsOnline,
              LastSeen,
              CreatedAt
            FROM Users WHERE Email = @email
            UNION ALL
            SELECT 
              'Admin' as UserType,
              AdminID as ID,
              Username,
              Email,
              Password,
              ProfilePicture,
              Role,
              IsOnline,
              LastSeen,
              CreatedAt
            FROM Admins WHERE Email = @email
          `);
  
        if (result.recordset.length === 0) {
          throw new Error('Invalid email or password');
        }
  
        const user = result.recordset[0];
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.Password);
        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }
  
        // Remove password from returned user object
        const { Password, ...userWithoutPassword } = user;
  
        return {
          success: true,
          user: userWithoutPassword
        };
      } catch (err) {
        console.error('Login Error:', err);
        throw err;
      } finally {
        if (pool) pool.close();
      }
    }*/
  // Login user
  static async login(email, password) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      // Check in both Users and Admins tables separately
      const userResult = await pool.request()
        .input('email', sql.NVarChar, email)
        .query(`
          SELECT 
            'User' as UserType,
            UserID as ID,
            Username,
            Email,
            Password,
            ProfilePicture,
            Role,
            IsOnline,
            LastSeen,
            CreatedAt
          FROM Users 
          WHERE Email = @email
        `);

      const adminResult = await pool.request()
        .input('email', sql.NVarChar, email)
        .query(`
          SELECT 
            'Admin' as UserType,
            AdminID as ID,
            Username,
            Email,
            Password,
            ProfilePicture,
            Role,
            IsOnline,
            LastSeen,
            CreatedAt
          FROM Admins 
          WHERE Email = @email
        `);

      let user = null;
      let isUser = false;

      // Check Users table first
      if (userResult.recordset.length > 0) {
        user = userResult.recordset[0];
        isUser = true;
      }
      // Then check Admins table
      else if (adminResult.recordset.length > 0) {
        user = adminResult.recordset[0];
        isUser = false;
      } else {
        throw new Error('Invalid email or password');
      }

      let isValidPassword = false;

      if (isUser) {
        // For Users: Always use bcrypt (passwords are hashed during registration)
        isValidPassword = await bcrypt.compare(password, user.Password);
      } else {
        // For Admins: Check if password is hashed or plain text
        const isBcryptHash = user.Password.startsWith('$2b$');

        if (isBcryptHash) {
          // Admin password is hashed
          isValidPassword = await bcrypt.compare(password, user.Password);
        } else {
          // Admin password is plain text (legacy)
          isValidPassword = (user.Password === password);

          // Auto-upgrade to hashed password if login successful
          if (isValidPassword) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.request()
              .input('adminID', sql.Int, user.ID)
              .input('hashedPassword', sql.NVarChar, hashedPassword)
              .query('UPDATE Admins SET Password = @hashedPassword WHERE AdminID = @adminID');
          }
        }
      }

      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Remove password from returned user object
      const { Password, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword
      };
    } catch (err) {
      console.error('Login Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Get user by ID
  static async getUserById(userId, userType = 'User') {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const tableName = userType === 'Admin' ? 'Admins' : 'Users';
      const idField = userType === 'Admin' ? 'AdminID' : 'UserID';

      const result = await pool.request()
        .input('id', sql.Int, userId)
        .query(`
          SELECT 
            ${idField} as ID,
            Username,
            Email,
            ProfilePicture,
            Role,
            IsOnline,
            LastSeen,
            CreatedAt
          FROM ${tableName} 
          WHERE ${idField} = @id
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return {
        ...result.recordset[0],
        userType: userType
      };
    } catch (err) {
      console.error('Get User Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Update user profile
  static async updateProfile(userId, userType, updateData) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      const tableName = userType === 'Admin' ? 'Admins' : 'Users';
      const idField = userType === 'Admin' ? 'AdminID' : 'UserID';

      let query = `UPDATE ${tableName} SET `;
      const inputs = {};

      if (updateData.username) {
        query += `Username = @username, `;
        inputs.username = updateData.username;
      }

      if (updateData.email) {
        query += `Email = @email, `;
        inputs.email = updateData.email;
      }

      if (updateData.profilePicture) {
        query += `ProfilePicture = @profilePicture, `;
        inputs.profilePicture = updateData.profilePicture;
      }

      if (updateData.password) {
        const hashedPassword = await bcrypt.hash(updateData.password, 10);
        query += `Password = @password, `;
        inputs.password = hashedPassword;
      }

      // Remove trailing comma and space
      query = query.slice(0, -2);
      query += ` WHERE ${idField} = @userId`;

      const request = pool.request()
        .input('userId', sql.Int, userId);

      // Add dynamic inputs
      Object.keys(inputs).forEach(key => {
        request.input(key, sql.NVarChar, inputs[key]);
      });

      await request.query(query);

      // Return updated user
      return await this.getUserById(userId, userType);
    } catch (err) {
      console.error('Update Profile Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Reset password for any user (Admin tool)
  static async resetPassword(userId, userType, newPassword) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const tableName = userType === 'Admin' ? 'Admins' : 'Users';
      const idField = userType === 'Admin' ? 'AdminID' : 'UserID';

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.request()
        .input('userId', sql.Int, userId)
        .input('password', sql.NVarChar, hashedPassword)
        .query(`UPDATE ${tableName} SET Password = @password WHERE ${idField} = @userId`);

      return true;
    } catch (err) {
      console.error('Reset Password Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Register user with specific role (NGO, User, etc.)
  static async registerWithRole(userData, role) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);

      // Check if user already exists
      const existingUser = await pool.request()
        .input('email', sql.NVarChar, userData.email)
        .query(`
          SELECT UserID FROM Users WHERE Email = @email
          UNION ALL
          SELECT AdminID as UserID FROM Admins WHERE Email = @email
        `);

      if (existingUser.recordset.length > 0) {
        throw new Error('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const result = await pool.request()
        .input('username', sql.NVarChar, userData.username)
        .input('email', sql.NVarChar, userData.email)
        .input('password', sql.NVarChar, hashedPassword)
        .input('role', sql.NVarChar, role)
        .query(`
          INSERT INTO Users (Username, Email, Password, Role, CreatedAt)
          OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.Role
          VALUES (@username, @email, @password, @role, GETDATE())
        `);

      return result.recordset[0];
    } catch (err) {
      console.error('Register With Role Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Get all users by role
  static async getAllByRole(role) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .input('role', sql.NVarChar, role)
        .query('SELECT UserID as ID, Username, Email, Role, CreatedAt FROM Users WHERE Role = @role');
      return result.recordset;
    } catch (err) {
      console.error('Get All By Role Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }

  // Get all system users for management
  static async getAllUsers() {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .query(`
          SELECT UserID as ID, Username, Email, Role, 'User' as UserType, CreatedAt FROM Users
          UNION ALL
          SELECT AdminID as ID, Username, Email, Role, 'Admin' as UserType, CreatedAt FROM Admins
        `);
      return result.recordset;
    } catch (err) {
      console.error('Get All Users Error:', err);
      throw err;
    } finally {
      if (pool) pool.close();
    }
  }
}

module.exports = User;