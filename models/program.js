const sql = require('mssql');
const dbConfig = require('../dbConfig');

class Program {
    
    // Get all active programs (for the public page)
    static async getAllPrograms() {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .query(`
                    SELECT * FROM Programs 
                    WHERE IsActive = 1 
                    ORDER BY CreatedAt DESC
                `);
            return result.recordset;
        } catch (err) {
            console.error('SQL Get All Programs Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Get a single program by ID (for details/enrollment page)
    static async getProgramById(id) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT * FROM Programs 
                    WHERE ProgramID = @id AND IsActive = 1
                `);
            return result.recordset[0];
        } catch (err) {
            console.error('SQL Get Program By ID Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Create a new program (Admin only)
    static async createProgram(data) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('title', sql.NVarChar, data.title)
                .input('type', sql.NVarChar, data.type) // 'Education' or 'Trip'
                .input('description', sql.NVarChar, data.description)
                .input('imageURL', sql.NVarChar, data.imageURL || null)
                .input('price', sql.Decimal(10, 2), data.price)
                .input('location', sql.NVarChar, data.location || null) // Nullable for online courses
                .input('duration', sql.NVarChar, data.duration)
                .input('maxParticipants', sql.Int, data.maxParticipants)
                .query(`
                    INSERT INTO Programs (Title, Type, Description, ImageURL, Price, Location, Duration, MaxParticipants, EnrolledCount, IsActive)
                    VALUES (@title, @type, @description, @imageURL, @price, @location, @duration, @maxParticipants, 0, 1);
                    SELECT SCOPE_IDENTITY() AS ProgramID;
                `);
            
            return result.recordset[0].ProgramID;
        } catch (err) {
            console.error('SQL Create Program Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Update an existing program
    static async updateProgram(id, data) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            await pool.request()
                .input('id', sql.Int, id)
                .input('title', sql.NVarChar, data.title)
                .input('description', sql.NVarChar, data.description)
                .input('price', sql.Decimal(10, 2), data.price)
                .input('imageURL', sql.NVarChar, data.imageURL)
                .input('location', sql.NVarChar, data.location)
                .input('duration', sql.NVarChar, data.duration)
                .input('maxParticipants', sql.Int, data.maxParticipants)
                .query(`
                    UPDATE Programs 
                    SET 
                        Title = @title, 
                        Description = @description, 
                        Price = @price,
                        ImageURL = @imageURL,
                        Location = @location,
                        Duration = @duration,
                        MaxParticipants = @maxParticipants
                    WHERE ProgramID = @id
                `);
            return true;
        } catch (err) {
            console.error('SQL Update Program Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Soft Delete a program (Set IsActive = 0)
    static async deleteProgram(id) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    UPDATE Programs 
                    SET IsActive = 0 
                    WHERE ProgramID = @id
                `);
            return true;
        } catch (err) {
            console.error('SQL Delete Program Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Helper: Update enrolled count (called when a user enrolls)
    static async incrementEnrollment(id, count = 1) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            await pool.request()
                .input('id', sql.Int, id)
                .input('count', sql.Int, count)
                .query(`
                    UPDATE Programs 
                    SET EnrolledCount = EnrolledCount + @count
                    WHERE ProgramID = @id
                `);
        } catch (err) {
            console.error('SQL Increment Enrollment Error:', err);
        } finally {
            if (pool) pool.close();
        }
    }
}

module.exports = Program;