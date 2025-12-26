const sql = require('mssql');
const dbConfig = require('../dbConfig');

class NGOStats {
    // Get stats for a specific NGO
    static async getStatsByUserId(userId) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query("SELECT * FROM NGOProjectStats WHERE UserID = @userId");
            return result.recordset[0];
        } catch (err) {
            console.error('SQL Get NGO Stats Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }

    // Create or Update stats
    static async updateStats(userId, data) {
        let pool;
        try {
            pool = await sql.connect(dbConfig);

            // Check if record exists
            const check = await pool.request()
                .input('userId', sql.Int, userId)
                .query("SELECT COUNT(*) as count FROM NGOProjectStats WHERE UserID = @userId");

            if (check.recordset[0].count === 0) {
                // Insert
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('funding', sql.Decimal(18, 2), data.totalFunding)
                    .input('built', sql.Int, data.housesBuilt)
                    .input('progress', sql.Int, data.progress)
                    .input('completed', sql.Int, data.homesCompleted)
                    .input('inProgress', sql.Int, data.constructionInProgress)
                    .input('families', sql.Int, data.impactedFamilies)
                    .input('co2', sql.Int, data.co2Saved)
                    .query(`
                        INSERT INTO NGOProjectStats 
                        (UserID, TotalFunding, HousesBuilt, Progress, HomesCompleted, ConstructionInProgress, ImpactedFamilies, CO2Saved, UpdatedAt)
                        VALUES (@userId, @funding, @built, @progress, @completed, @inProgress, @families, @co2, GETDATE())
                    `);
            } else {
                // Update
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('funding', sql.Decimal(18, 2), data.totalFunding)
                    .input('built', sql.Int, data.housesBuilt)
                    .input('progress', sql.Int, data.progress)
                    .input('completed', sql.Int, data.homesCompleted)
                    .input('inProgress', sql.Int, data.constructionInProgress)
                    .input('families', sql.Int, data.impactedFamilies)
                    .input('co2', sql.Int, data.co2Saved)
                    .query(`
                        UPDATE NGOProjectStats 
                        SET TotalFunding = @funding, 
                            HousesBuilt = @built, 
                            Progress = @progress, 
                            HomesCompleted = @completed, 
                            ConstructionInProgress = @inProgress, 
                            ImpactedFamilies = @families, 
                            CO2Saved = @co2, 
                            UpdatedAt = GETDATE()
                        WHERE UserID = @userId
                    `);
            }
            return true;
        } catch (err) {
            console.error('SQL Update NGO Stats Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }
}

module.exports = NGOStats;
