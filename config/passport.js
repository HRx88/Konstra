const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const crypto = require('crypto');
const sql = require('mssql');
const dbConfig = require('../dbConfig');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
},
    async (accessToken, refreshToken, profile, cb) => {
        let pool;
        try {
            const email = profile.emails[0].value;
            const username = profile.displayName;
            const profilePicture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

            pool = await sql.connect(dbConfig);

            // Check if user exists in either table
            const result = await pool.request()
                .input('email', sql.NVarChar, email)
                .query(`
          SELECT UserID as ID, 'User' as UserType, Username, Email, Role, ProfilePicture FROM Users WHERE Email = @email
          UNION ALL
          SELECT AdminID as ID, 'Admin' as UserType, Username, Email, Role, ProfilePicture FROM Admins WHERE Email = @email
        `);

            if (result.recordset.length > 0) {
                // User exists
                return cb(null, result.recordset[0]);
            } else {
                // Register new user
                // Generate random password
                const randomPassword = crypto.randomBytes(16).toString('hex');

                // Uses User.register which handles connection internally, so we don't need the pool here for that.
                // But we already opened a pool. That's fine, mssql handles connection pooling.

                const registerResult = await User.register({
                    username: username,
                    email: email,
                    password: randomPassword,
                    profilePicture: profilePicture
                });

                // Standardize the user object to match the finding structure
                const newUser = {
                    ID: registerResult.user.UserID,
                    UserType: 'User',
                    Username: registerResult.user.Username,
                    Email: registerResult.user.Email,
                    Role: registerResult.user.Role,
                    ProfilePicture: registerResult.user.ProfilePicture
                };

                return cb(null, newUser);
            }
        } catch (err) {
            return cb(err);
        } finally {
            if (pool) pool.close();
        }
    }
));

// Serialize/Deserialize
passport.serializeUser((user, done) => {
    done(null, { id: user.ID || user.UserID, type: user.UserType || (user.Role === 'Admin' ? 'Admin' : 'User') });
});

passport.deserializeUser(async (obj, done) => {
    try {
        const user = await User.getUserById(obj.id, obj.type);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
