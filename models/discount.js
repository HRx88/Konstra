const sql = require('mssql');
const dbConfig = require('../dbConfig');

class Discount {
    // Validate a code for a specific program (or any)
    static async validateCode(code, programId = null) {
        try {
            let pool = await sql.connect(dbConfig);

            // Query to find the code
            const result = await pool.request()
                .input('code', sql.NVarChar, code)
                .query(`
                    SELECT * FROM DiscountCodes 
                    WHERE Code = @code 
                    AND IsActive = 1
                `);

            if (result.recordset.length === 0) {
                return { valid: false, message: 'Invalid code' };
            }

            const discount = result.recordset[0];

            // Check Expiry
            if (discount.ExpiryDate && new Date(discount.ExpiryDate) < new Date()) {
                return { valid: false, message: 'Code has expired' };
            }

            // Check Usage Limits
            if (discount.MaxUses && discount.CurrentUses >= discount.MaxUses) {
                return { valid: false, message: 'Code usage limit reached' };
            }

            // Check Program Applicability
            // If Discount has a ProgramID, it MUST match the requested ProgramID
            // If Discount ProgramID is NULL, it applies to ALL
            if (discount.ProgramID && parseInt(discount.ProgramID) !== parseInt(programId)) {
                // Fetch program name for better error message if possible, or just generic
                return { valid: false, message: 'This code is not valid for this program' };
            }

            return {
                valid: true,
                discount: {
                    code: discount.Code,
                    type: discount.DiscountType,
                    value: discount.Value,
                    id: discount.CodeID
                }
            };

        } catch (err) {
            console.error('Discount Validation Error:', err);
            throw err;
        }
    }

    // Increment usage count
    static async recordUsage(code) {
        try {
            let pool = await sql.connect(dbConfig);
            await pool.request()
                .input('code', sql.NVarChar, code)
                .query(`
                    UPDATE DiscountCodes 
                    SET CurrentUses = CurrentUses + 1 
                    WHERE Code = @code
                `);
        } catch (err) {
            console.error('Error recording discount usage:', err);
        }
    }

    // Create a Welcome Code for a new user
    static async createWelcomeCode(userId, username) {
        try {
            // Generate unique code: WELCOME-[UserID]-[Random4]
            // Or simpler: WELCOME-[USERNAME-PREFIX]
            // Let's use: WELCOME-[USERNAME] (cleaned)
            const cleanUser = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10);
            const code = `WELCOME-${cleanUser}-${userId}`;

            let pool = await sql.connect(dbConfig);

            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + 1);

            await pool.request()
                .input('code', sql.NVarChar, code)
                .input('value', sql.Decimal(10, 2), 20.00) // 20% OFF
                .input('type', sql.NVarChar, 'Percentage')
                .input('maxUses', sql.Int, 1) // One-time use
                .input('expiry', sql.DateTime, expiry)
                .input('programId', sql.Int, null) // Valid for any program
                .input('createdBy', sql.NVarChar, 'System-Welcome')
                .query(`
                    INSERT INTO DiscountCodes (Code, DiscountType, Value, MaxUses, ExpiryDate, IsActive, CreatedBy)
                    VALUES (@code, @type, @value, @maxUses, @expiry, 1, @createdBy)
                `);

            return code;
        } catch (err) {
            console.error('Error creating welcome code:', err);
            return null;
        }
    }

    // --- Admin Methods ---

    static async getAll() {
        try {
            let pool = await sql.connect(dbConfig);
            const result = await pool.request().query('SELECT * FROM DiscountCodes ORDER BY CreatedAt DESC');
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }

    static async create(data) {
        try {
            let pool = await sql.connect(dbConfig);
            await pool.request()
                .input('code', sql.NVarChar, data.code)
                .input('type', sql.NVarChar, data.type)
                .input('value', sql.Decimal(10, 2), data.value)
                .input('maxUses', sql.Int, data.maxUses || null)
                .input('expiry', sql.DateTime, data.expiry || null)
                .input('programId', sql.Int, data.programId || null)
                .input('createdBy', sql.NVarChar, data.createdBy || 'Admin')
                .query(`
                    INSERT INTO DiscountCodes (Code, DiscountType, Value, MaxUses, ExpiryDate, ProgramID, CreatedBy, IsActive)
                    VALUES (@code, @type, @value, @maxUses, @expiry, @programId, @createdBy, 1)
                `);
            return true;
        } catch (err) {
            throw err;
        }
    }

    static async delete(id) {
        try {
            let pool = await sql.connect(dbConfig);
            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM DiscountCodes WHERE CodeID = @id');
            return true;
        } catch (err) {
            throw err;
        }
    }

    // Get active discount codes for a user (Welcome codes)
    static async getByUserId(userId) {
        try {
            let pool = await sql.connect(dbConfig);
            // Welcome codes are created with Code pattern WELCOME-*-{userId}
            const result = await pool.request()
                .input('pattern', sql.NVarChar, `%-${userId}`)
                .query(`
                    SELECT * FROM DiscountCodes 
                    WHERE Code LIKE @pattern 
                    AND IsActive = 1
                    AND (MaxUses IS NULL OR CurrentUses < MaxUses)
                    ORDER BY CreatedAt DESC
                `);
            return result.recordset;
        } catch (err) {
            console.error('Error fetching user discounts:', err);
            return [];
        }
    }

    // Get all public (global) discount codes (not user-specific welcome codes)
    static async getPublicCodes() {
        try {
            let pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .query(`
                    SELECT * FROM DiscountCodes 
                    WHERE IsActive = 1
                    AND Code NOT LIKE 'WELCOME-%'
                    AND (MaxUses IS NULL OR CurrentUses < MaxUses)
                    AND (ExpiryDate IS NULL OR ExpiryDate > GETDATE())
                    ORDER BY CreatedAt DESC
                `);
            return result.recordset;
        } catch (err) {
            console.error('Error fetching public discounts:', err);
            return [];
        }
    }
}

module.exports = Discount;
