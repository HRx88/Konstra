const sql = require('mssql');
const dbConfig = require('../dbConfig');

class ProgramModule {

    // Get all modules for a specific program
    static async getModulesByProgramId(programId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('programId', sql.Int, programId)
                .query(`
                    SELECT 
                        ModuleID,
                        ProgramID,
                        Title,
                        Description,
                        ContentURL,
                        ContentType,
                        OrderIndex,
                        CreatedAt
                    FROM ProgramModules
                    WHERE ProgramID = @programId
                    ORDER BY OrderIndex ASC
                `);
            return result.recordset;
        } catch (err) {
            console.error('SQL Get Modules Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Get user progress for a specific enrollment
    static async getUserProgress(enrollmentId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .query(`
                    SELECT 
                        ump.ProgressID,
                        ump.ModuleID,
                        ump.CompletedAt,
                        pm.Title,
                        pm.OrderIndex
                    FROM UserModuleProgress ump
                    INNER JOIN ProgramModules pm ON ump.ModuleID = pm.ModuleID
                    WHERE ump.EnrollmentID = @enrollmentId
                    ORDER BY pm.OrderIndex ASC
                `);
            return result.recordset;
        } catch (err) {
            console.error('SQL Get User Progress Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Mark a module as complete
    static async markModuleComplete(enrollmentId, moduleId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);

            // Check if already completed
            const check = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .input('moduleId', sql.Int, moduleId)
                .query(`SELECT ProgressID FROM UserModuleProgress WHERE EnrollmentID = @enrollmentId AND ModuleID = @moduleId`);

            if (check.recordset.length > 0) {
                return { success: false, message: 'Module already completed.' };
            }

            // Mark as complete
            await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .input('moduleId', sql.Int, moduleId)
                .query(`
                    INSERT INTO UserModuleProgress (EnrollmentID, ModuleID, CompletedAt)
                    VALUES (@enrollmentId, @moduleId, GETDATE())
                `);

            // Recalculate progress
            await this.recalculateProgress(enrollmentId, pool);

            return { success: true };
        } catch (err) {
            console.error('SQL Mark Module Complete Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Recalculate enrollment progress based on completed modules
    static async recalculateProgress(enrollmentId, pool = null) {
        const shouldClose = !pool;
        try {
            if (!pool) {
                pool = await sql.connect(dbConfig);
            }

            // Get program ID from enrollment
            const enrollmentResult = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .query(`SELECT ProgramID FROM Enrollments WHERE EnrollmentID = @enrollmentId`);

            if (enrollmentResult.recordset.length === 0) {
                throw new Error('Enrollment not found');
            }

            const programId = enrollmentResult.recordset[0].ProgramID;

            // Count total modules
            const totalResult = await pool.request()
                .input('programId', sql.Int, programId)
                .query(`SELECT COUNT(*) AS Total FROM ProgramModules WHERE ProgramID = @programId`);

            const totalModules = totalResult.recordset[0].Total;

            if (totalModules === 0) {
                return; // No modules, no progress to calculate
            }

            // Count completed modules
            const completedResult = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .query(`SELECT COUNT(*) AS Completed FROM UserModuleProgress WHERE EnrollmentID = @enrollmentId`);

            const completedModules = completedResult.recordset[0].Completed;

            // Calculate progress percentage
            const progress = Math.round((completedModules / totalModules) * 100);

            // Update enrollment
            await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .input('progress', sql.Int, progress)
                .query(`
                    UPDATE Enrollments 
                    SET Progress = @progress,
                        Status = CASE WHEN @progress = 100 THEN 'Completed' ELSE Status END
                    WHERE EnrollmentID = @enrollmentId
                `);

        } catch (err) {
            console.error('SQL Recalculate Progress Error:', err);
            throw err;
        } finally {
            if (shouldClose && pool) pool.close();
        }
    }

    // Create a new module
    static async createModule(programId, data) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('programId', sql.Int, programId)
                .input('title', sql.NVarChar, data.title)
                .input('description', sql.NVarChar, data.description || null)
                .input('contentURL', sql.NVarChar(sql.MAX), data.contentURL)
                .input('contentType', sql.NVarChar, data.contentType)
                .input('orderIndex', sql.Int, data.orderIndex)
                .query(`
                    INSERT INTO ProgramModules (ProgramID, Title, Description, ContentURL, ContentType, OrderIndex)
                    OUTPUT INSERTED.*
                    VALUES (@programId, @title, @description, @contentURL, @contentType, @orderIndex)
                `);

            return { success: true, module: result.recordset[0] };
        } catch (err) {
            console.error('SQL Create Module Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Update an existing module
    static async updateModule(moduleId, data) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('moduleId', sql.Int, moduleId)
                .input('title', sql.NVarChar, data.title)
                .input('description', sql.NVarChar, data.description || null)
                .input('contentURL', sql.NVarChar(sql.MAX), data.contentURL)
                .input('contentType', sql.NVarChar, data.contentType)
                .input('orderIndex', sql.Int, data.orderIndex)
                .query(`
                    UPDATE ProgramModules 
                    SET Title = @title,
                        Description = @description,
                        ContentURL = @contentURL,
                        ContentType = @contentType,
                        OrderIndex = @orderIndex
                    OUTPUT INSERTED.*
                    WHERE ModuleID = @moduleId
                `);

            if (result.recordset.length === 0) {
                return { success: false, message: 'Module not found' };
            }

            return { success: true, module: result.recordset[0] };
        } catch (err) {
            console.error('SQL Update Module Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Delete a module
    static async deleteModule(moduleId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);

            // First check if module exists and get associated data including OrderIndex
            const checkResult = await pool.request()
                .input('moduleId', sql.Int, moduleId)
                .query(`SELECT ModuleID, ProgramID, OrderIndex FROM ProgramModules WHERE ModuleID = @moduleId`);

            if (checkResult.recordset.length === 0) {
                return { success: false, message: 'Module not found' };
            }

            const moduleData = checkResult.recordset[0];

            // Delete associated user progress first to avoid FK constraint error
            await pool.request()
                .input('moduleId', sql.Int, moduleId)
                .query(`DELETE FROM UserModuleProgress WHERE ModuleID = @moduleId`);

            // Delete module
            await pool.request()
                .input('moduleId', sql.Int, moduleId)
                .query(`DELETE FROM ProgramModules WHERE ModuleID = @moduleId`);

            // Renormalize order for all modules in this program (close all gaps)
            await pool.request()
                .input('programId', sql.Int, moduleData.ProgramID)
                .query(`
                    WITH CTE AS (
                        SELECT ModuleID, ROW_NUMBER() OVER (ORDER BY OrderIndex ASC) as NewOrder
                        FROM ProgramModules
                        WHERE ProgramID = @programId
                    )
                    UPDATE ProgramModules 
                    SET OrderIndex = CTE.NewOrder
                    FROM ProgramModules
                    INNER JOIN CTE ON ProgramModules.ModuleID = CTE.ModuleID
                `);

            return { success: true, message: 'Module deleted and reordered successfully' };
        } catch (err) {
            console.error('SQL Delete Module Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }
    // Get a single module by ID
    static async getModuleById(moduleId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('moduleId', sql.Int, moduleId)
                .query(`
                    SELECT * FROM ProgramModules WHERE ModuleID = @moduleId
                `);
            return result.recordset[0];
        } catch (err) {
            console.error('SQL Get Module By ID Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }
}

module.exports = ProgramModule;

