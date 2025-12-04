const sql = require('mssql');
const dbConfig = require('../dbConfig');

class Meeting {
  
  // Create Meeting
  static async createMeeting(userID, eventName, startTime, endTime, meetingType, hostRoomURL = null, participantURL = null) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .input('userID', sql.Int, userID)
        .input('eventName', sql.NVarChar, eventName)
        .input('startTime', sql.DateTime, new Date(startTime))
        .input('endTime', sql.DateTime, new Date(endTime))
        .input('meetingType', sql.NVarChar, meetingType)
        .input('hostRoomURL', sql.NVarChar, hostRoomURL)
        .input('participantURL', sql.NVarChar, participantURL)
        .query(`
          INSERT INTO Meetings (UserID, EventName, StartTime, EndTime, MeetingType, HostRoomURL, ParticipantURL)
          VALUES (@userID, @eventName, @startTime, @endTime, @meetingType, @hostRoomURL, @participantURL);
          SELECT SCOPE_IDENTITY() AS MeetingID;
        `);
      return result.recordset[0].MeetingID;
    } catch (err) { throw err; } finally { if (pool) pool.close(); }
  }

  // Get All Meetings For User
  static async getMeetingsByUser(userID) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .input('userID', sql.Int, userID)
        .query(`
          SELECT * FROM Meetings 
          WHERE UserID = @userID
          ORDER BY StartTime DESC
        `);
      return result.recordset;
    } catch (err) { throw err; } finally { if (pool) pool.close(); }
  }

  // NEW: Get Single Meeting By ID
  static async getMeetingById(meetingID) {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .input('meetingID', sql.Int, meetingID)
        .query(`SELECT * FROM Meetings WHERE MeetingID = @meetingID`);
      return result.recordset[0] || null;
    } catch (err) { throw err; } finally { if (pool) pool.close(); }
  }

 static async getAllMeetings() {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .query(`
          SELECT 
            m.MeetingID, m.UserID, m.EventName, m.StartTime, m.EndTime, m.MeetingType,
            m.HostRoomURL, m.ParticipantURL,
            u.Username as UserName, 
            u.Email as UserEmail
          FROM Meetings m
          JOIN Users u ON m.UserID = u.UserID
          ORDER BY m.StartTime DESC
        `);
      return result.recordset;
    } catch (err) { throw err; } finally { if (pool) pool.close(); }
  }


}

module.exports = Meeting;