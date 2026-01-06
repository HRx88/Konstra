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

    // Get slots for a specific program
    static async getSlotsByProgramId(programId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('programId', sql.Int, programId)
                .query(`
                    SELECT SlotID, StartTime, EndTime, Capacity, BookedCount
                    FROM ProgramSlots
                    WHERE ProgramID = @programId AND IsActive = 1 AND BookedCount < Capacity
                    ORDER BY StartTime ASC
                `);
            return result.recordset;
        } catch (err) {
            console.error('SQL Get Slots Error:', err);
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

            let query = `UPDATE Programs SET `;
            const inputs = {};
            let hasUpdate = false;

            if (data.title && data.title.trim()) {
                query += `Title = @title, `;
                inputs.title = data.title.trim();
                hasUpdate = true;
            }
            if (data.description && data.description.trim()) {
                query += `Description = @description, `;
                inputs.description = data.description.trim();
                hasUpdate = true;
            }
            if (data.price !== undefined && data.price !== null) {
                query += `Price = @price, `;
                inputs.price = data.price;
                hasUpdate = true;
            }
            if (data.imageURL && data.imageURL.trim()) { // Allow updating image separately
                query += `ImageURL = @imageURL, `;
                inputs.imageURL = data.imageURL.trim();
                hasUpdate = true;
            }
            if (data.location && data.location.trim()) {
                query += `Location = @location, `;
                inputs.location = data.location.trim();
                hasUpdate = true;
            }
            if (data.duration && data.duration.trim()) {
                query += `Duration = @duration, `;
                inputs.duration = data.duration.trim();
                hasUpdate = true;
            }
            if (data.maxParticipants) {
                query += `MaxParticipants = @maxParticipants, `;
                inputs.maxParticipants = data.maxParticipants;
                hasUpdate = true;
            }

            if (!hasUpdate) return false; // Nothing to update

            // Remove trailing comma and space
            query = query.slice(0, -2);
            query += ` WHERE ProgramID = @id`;

            const request = pool.request().input('id', sql.Int, id);

            // Bind dynamic inputs
            for (const [key, value] of Object.entries(inputs)) {
                if (key === 'price') request.input(key, sql.Decimal(10, 2), value);
                else if (key === 'maxParticipants') request.input(key, sql.Int, value);
                else request.input(key, sql.NVarChar, value);
            }

            await request.query(query);
            return true;
        } catch (err) {
            console.error('SQL Update Program Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }



    // --- SLOTS MANAGEMENT ---

    // Create a new slot
    static async createSlot(programId, data) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('programId', sql.Int, programId)
                .input('startTime', sql.DateTime, data.startTime)
                .input('endTime', sql.DateTime, data.endTime)
                .input('capacity', sql.Int, data.capacity)
                .query(`
                    INSERT INTO ProgramSlots (ProgramID, StartTime, EndTime, Capacity, BookedCount, IsActive)
                    VALUES (@programId, @startTime, @endTime, @capacity, 0, 1);
                    SELECT SCOPE_IDENTITY() AS SlotID;
                `);
            return result.recordset[0].SlotID;
        } catch (err) {
            console.error('SQL Create Slot Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Delete a slot (Only if no bookings)
    static async deleteSlot(slotId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);

            // Check for bookings first
            const check = await pool.request()
                .input('id', sql.Int, slotId)
                .query('SELECT BookedCount FROM ProgramSlots WHERE SlotID = @id');

            if (check.recordset.length === 0) return false; // Not found
            if (check.recordset[0].BookedCount > 0) {
                // Soft delete if booked
                await pool.request().input('id', sql.Int, slotId).query('UPDATE ProgramSlots SET IsActive = 0 WHERE SlotID = @id');
                return true;
            }

            // Hard delete if empty
            await pool.request()
                .input('id', sql.Int, slotId)
                .query('DELETE FROM ProgramSlots WHERE SlotID = @id');
            return true;
        } catch (err) {
            console.error('SQL Delete Slot Error:', err);
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