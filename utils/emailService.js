const nodemailer = require('nodemailer');

// Configure transporter using environment variables
const transporter = nodemailer.createTransport({
    service: process.env.SMTPService || 'gmail',
    auth: {
        user: process.env.SMTPUser,
        pass: process.env.SMTPUserPassword
    }
});

class EmailService {
    /**
     * Send welcome email to newly created NGO
     * @param {string} email - NGO email
     * @param {string} username - NGO username
     * @param {string} password - Temporary password
     */
    static async sendNGOWelcomeEmail(email, username, password) {
        const mailOptions = {
            from: `"Konstra Admin" <${process.env.SMTPUser}>`,
            to: email,
            subject: 'Welcome to Konstra - NGO Partner Account Created',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #d32f2f;">Welcome to Konstra!</h2>
                    <p>Hello <strong>${username}</strong>,</p>
                    <p>An administrative account has been created for your organization on the Konstra NGO Platform.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Your Login Credentials:</strong></p>
                        <p style="margin: 10px 0 0 0;">Username: <code>${username}</code></p>
                        <p style="margin: 5px 0 0 0;">Email: <code>${email}</code></p>
                        <p style="margin: 5px 0 0 0;">Temporary Password: <code>${password}</code></p>
                    </div>
                    <p>Please log in and change your password as soon as possible for security.</p>
                    <a href="${process.env.APP_URL || 'http://localhost:8000'}/login.html" style="display: inline-block; background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Login to Portal</a>
                    <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
                    <p style="font-size: 0.8rem; color: #777;">This is an automated message. If you did not expect this, please contact our support team.</p>
                </div>
            `
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent: ' + info.response);
            return true;
        } catch (error) {
            console.error('Email Error:', error);
            // We don't want to throw error and break the registration flow, 
            // but we should log it.
            return false;
        }
    }

    /**
     * Send password reset notification
     * @param {string} email - User email
     * @param {string} newPassword - New temporary password
     */
    static async sendPasswordResetEmail(email, newPassword) {
        const mailOptions = {
            from: `"Konstra Admin" <${process.env.SMTPUser}>`,
            to: email,
            subject: 'Your Konstra Password has been Reset',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #d32f2f;">Password Reset Successful</h2>
                    <p>Hello,</p>
                    <p>As requested, your password for Konstra has been reset by an administrator.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Your New Temporary Password:</strong></p>
                        <p style="margin: 10px 0 0 0;"><code>${newPassword}</code></p>
                    </div>
                    <p>Please log in and change your password immediately.</p>
                    <a href="${process.env.APP_URL || 'http://localhost:8000'}/login.html" style="display: inline-block; background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Log In Now</a>
                    <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
                    <p style="font-size: 0.8rem; color: #777;">If you did not request this change, please contact an administrator immediately.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Password Reset Email Error:', error);
            return false;
        }
    }
}

module.exports = EmailService;
