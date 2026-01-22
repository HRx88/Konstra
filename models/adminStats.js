const sql = require('mssql');
const dbConfig = require('../dbConfig');

class AdminStats {

    // Get aggregated dashboard stats
    static async getDashboardStats() {
        let pool;
        try {
            pool = await sql.connect(dbConfig);

            // 1. KPI Cards Data
            const kpiQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM Users WHERE Role = 'User') as TotalUsers,
                    (SELECT COUNT(*) FROM Programs WHERE IsActive = 1) as ActivePrograms,
                    (SELECT COUNT(*) FROM Enrollments) as TotalEnrollments,
                    (SELECT COUNT(*) FROM Enrollments WHERE Status = 'Pending') as PendingRequests;
            `;
            const kpiResult = await pool.request().query(kpiQuery);
            const kpis = kpiResult.recordset[0];

            // 2. Revenue Calculation
            const revenueQuery = `
                SELECT SUM(p.Price) as TotalRevenue
                FROM Enrollments e
                JOIN Programs p ON e.ProgramID = p.ProgramID
                WHERE e.Status = 'Enrolled' OR e.Status = 'Completed' OR e.Status = 'Paid';
            `;
            const revenueResult = await pool.request().query(revenueQuery);
            const revenue = revenueResult.recordset[0].TotalRevenue || 0;

            // 3. Trends Chart (Simplified Last 6 Months)
            const trendQuery = `
                SELECT TOP 6
                    FORMAT(e.EnrollmentDate, 'MMM') as Month,
                    COUNT(e.EnrollmentID) as Enrollments,
                    SUM(p.Price) as Revenue
                FROM Enrollments e
                JOIN Programs p ON e.ProgramID = p.ProgramID
                WHERE e.EnrollmentDate >= DATEADD(MONTH, -6, GETDATE())
                GROUP BY FORMAT(e.EnrollmentDate, 'MMM'), YEAR(e.EnrollmentDate), MONTH(e.EnrollmentDate)
                ORDER BY YEAR(e.EnrollmentDate), MONTH(e.EnrollmentDate)
            `;
            const trendResult = await pool.request().query(trendQuery);

            // 4. Recent Activity
            const activityQuery = `
                SELECT TOP 10 
                    u.Username, 
                    u.ProfilePicture,
                    'Enrolled in ' + p.Title as Action,
                    e.EnrollmentDate as Date,
                    e.Status
                FROM Enrollments e
                JOIN Users u ON e.UserID = u.UserID
                JOIN Programs p ON e.ProgramID = p.ProgramID
                ORDER BY e.EnrollmentDate DESC
            `;
            const activityResult = await pool.request().query(activityQuery);

            // 5. Program Enrollment Distribution (Pie Chart)
            const demoQuery = `
                SELECT TOP 5 p.Title as Label, COUNT(e.EnrollmentID) as Count
                FROM Enrollments e
                JOIN Programs p ON e.ProgramID = p.ProgramID
                WHERE p.IsActive = 1
                GROUP BY p.Title
                ORDER BY Count DESC
            `;
            const demoResult = await pool.request().query(demoQuery);

            return {
                kpis: { ...kpis, Revenue: revenue },
                trends: trendResult.recordset,
                activity: activityResult.recordset,
                demographics: demoResult.recordset
            };

        } catch (err) {
            console.error('SQL Admin Stats Show Error:', err);
            throw err;
        } finally {
            if (pool) pool.close();
        }
    }
}

module.exports = AdminStats;
