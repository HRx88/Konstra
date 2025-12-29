const sql = require('mssql');
const dbConfig = require('../dbConfig');

class Enrollment {

    // Get all enrollments for a specific user
    static async getEnrollmentsByUserId(userId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT 
                        e.EnrollmentID,
                        e.EnrollmentDate,
                        e.Status,
                        e.Progress,
                        p.ProgramID,
                        p.Title AS ProgramTitle,
                        p.Type AS ProgramType,
                        p.Description AS ProgramDescription,
                        p.ImageURL AS ProgramImage,
                        p.Duration,
                        p.Location
                    FROM Enrollments e
                    INNER JOIN Programs p ON e.ProgramID = p.ProgramID
                    WHERE e.UserID = @userId
                    ORDER BY e.EnrollmentDate DESC
                `);
            return result.recordset;
        } catch (err) {
            console.error('SQL Get User Enrollments Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Create a new enrollment
    static async createEnrollment(userId, programId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);

            // Check if already enrolled
            const check = await pool.request()
                .input('userId', sql.Int, userId)
                .input('programId', sql.Int, programId)
                .query(`SELECT EnrollmentID FROM Enrollments WHERE UserID = @userId AND ProgramID = @programId`);

            if (check.recordset.length > 0) {
                return { success: false, message: 'Already enrolled in this program.' };
            }

            // Create Enrollment
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('programId', sql.Int, programId)
                .query(`
                    INSERT INTO Enrollments (UserID, ProgramID, EnrollmentDate, Status, Progress)
                    VALUES (@userId, @programId, GETDATE(), 'Active', 0);
                    
                    -- Update Program Enrolled Count
                    UPDATE Programs SET EnrolledCount = EnrolledCount + 1 WHERE ProgramID = @programId;
                `);

            return { success: true };
        } catch (err) {
            console.error('SQL Create Enrollment Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }
}

module.exports = Enrollment;
