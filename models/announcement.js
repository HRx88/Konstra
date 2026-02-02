const sql = require('mssql');
const dbConfig = require('../dbConfig');

class Announcement {

    // Get all active announcements
    static async getAllActive() {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .query(`
                    SELECT * FROM Announcements 
                    WHERE IsActive = 1 
                    ORDER BY CreatedAt DESC
                `);
            return result.recordset;
        } catch (err) {
            console.error('SQL Get Announcements Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Get latest N announcements
    static async getLatest(limit = 3) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) * FROM Announcements 
                    WHERE IsActive = 1 
                    ORDER BY CreatedAt DESC
                `);
            return result.recordset;
        } catch (err) {
            console.error('SQL Get Latest Announcements Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Create new announcement
    static async create(data) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('title', sql.NVarChar, data.title)
                .input('content', sql.NVarChar, data.content)
                .input('priority', sql.NVarChar, data.priority || 'Normal')
                .input('createdBy', sql.Int, data.createdBy)
                .query(`
                    INSERT INTO Announcements (Title, Content, Priority, CreatedBy, CreatedAt, IsActive)
                    OUTPUT INSERTED.*
                    VALUES (@title, @content, @priority, @createdBy, GETDATE(), 1)
                `);
            return result.recordset[0];
        } catch (err) {
            console.error('SQL Create Announcement Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }
}

module.exports = Announcement;
