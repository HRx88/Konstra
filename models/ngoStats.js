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
                // Update - Dynamic Query Construction
                let query = `UPDATE NGOProjectStats SET `;
                const inputs = {};
                let hasUpdate = false;

                if (data.totalFunding !== undefined) {
                    query += `TotalFunding = @funding, `;
                    inputs.funding = data.totalFunding;
                    hasUpdate = true;
                }
                if (data.housesBuilt !== undefined) {
                    query += `HousesBuilt = @built, `;
                    inputs.built = data.housesBuilt;
                    hasUpdate = true;
                }
                if (data.progress !== undefined) {
                    query += `Progress = @progress, `;
                    inputs.progress = data.progress;
                    hasUpdate = true;
                }
                if (data.homesCompleted !== undefined) {
                    query += `HomesCompleted = @completed, `;
                    inputs.completed = data.homesCompleted;
                    hasUpdate = true;
                }
                if (data.constructionInProgress !== undefined) {
                    query += `ConstructionInProgress = @inProgress, `;
                    inputs.inProgress = data.constructionInProgress;
                    hasUpdate = true;
                }
                if (data.impactedFamilies !== undefined) {
                    query += `ImpactedFamilies = @families, `;
                    inputs.families = data.impactedFamilies;
                    hasUpdate = true;
                }
                if (data.co2Saved !== undefined) {
                    query += `CO2Saved = @co2, `;
                    inputs.co2 = data.co2Saved;
                    hasUpdate = true;
                }

                if (hasUpdate) {
                    query += `UpdatedAt = GETDATE() WHERE UserID = @userId`;

                    const request = pool.request().input('userId', sql.Int, userId);

                    // Bind dynamic inputs
                    if (inputs.funding !== undefined) request.input('funding', sql.Decimal(18, 2), inputs.funding);
                    if (inputs.built !== undefined) request.input('built', sql.Int, inputs.built);
                    if (inputs.progress !== undefined) request.input('progress', sql.Int, inputs.progress);
                    if (inputs.completed !== undefined) request.input('completed', sql.Int, inputs.completed);
                    if (inputs.inProgress !== undefined) request.input('inProgress', sql.Int, inputs.inProgress);
                    if (inputs.families !== undefined) request.input('families', sql.Int, inputs.families);
                    if (inputs.co2 !== undefined) request.input('co2', sql.Int, inputs.co2);

                    await request.query(query);
                }
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
