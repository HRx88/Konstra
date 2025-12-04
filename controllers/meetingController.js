const Meeting = require("../models/meeting");


class MeetingController {

  // Create a Meeting
  static async createMeeting(req, res) {
    try {
      let { userID, eventName, startTime, endTime, calendlyEventURI } = req.body;
      
      console.log(`[CONTROLLER] Creating Meeting for User: ${userID}`);

      // ---------------------------------------------------------
      // NEW: If we have a Calendly URI, fetch the REAL time from Calendly
      // ---------------------------------------------------------
      if (calendlyEventURI) {
        console.log(`[CONTROLLER] Fetching details from Calendly URI: ${calendlyEventURI}`);
        try {
          const calendlyData = await MeetingController.fetchCalendlyDetails(calendlyEventURI);
          if (calendlyData) {
            startTime = calendlyData.startTime;
            endTime = calendlyData.endTime;
            eventName = calendlyData.name; // Use the official name from Calendly
            console.log(`[CONTROLLER] Fetched Times: ${startTime} - ${endTime}`);
          }
        } catch (calError) {
          console.error("Failed to fetch Calendly data:", calError.message);
          return res.status(400).json({ success: false, error: "Could not verify Calendly booking." });
        }
      }

      // 1. Determine Meeting Type
      const isOnline = eventName.toLowerCase().includes("online") || eventName.toLowerCase().includes("video");
      const meetingType = isOnline ? "Online" : "In-Person";

      let hostRoomUrl = null;
      let participantUrl = null;

      // 2. Generate Whereby Link (Only if Online)
      if (isOnline) {
        console.log(`[CONTROLLER] Generating Whereby Link...`);
        const wherebyLinks = await MeetingController.generateWherebyMeeting(endTime);
        
        if (wherebyLinks) {
          hostRoomUrl = wherebyLinks.hostRoomUrl;
          participantUrl = wherebyLinks.roomUrl;
        }
      }

      // 3. Save to Database
      const meetingID = await Meeting.createMeeting(
        userID,
        eventName,
        startTime,
        endTime,
        meetingType,
        hostRoomUrl,
        participantUrl
      );

      console.log(`[CONTROLLER] Meeting Created Successfully. ID: ${meetingID}`);

      res.status(201).json({
        success: true,
        message: "Meeting created successfully",
        data: {
          meetingID,
          meetingType,
          hostRoomUrl,
          participantUrl,
          startTime // Return this so frontend can display it
        }
      });

    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to create Meeting:', err);
      res.status(500).json({ 
        success: false, 
        error: "Failed to create Meeting" 
      });
    }
  }

// NEW: Join Meeting Logic
static async joinMeeting(req, res) {
    try {
      const { meetingID } = req.params;
      const { userID, userType } = req.query; // Expecting ?userID=X&userType=Admin

      console.log(`[CONTROLLER] Join Request: Meeting ${meetingID} by ${userType} ${userID}`);

      const meeting = await Meeting.getMeetingById(meetingID);

      if (!meeting) {
        return res.status(404).json({ success: false, error: "Meeting not found" });
      }

      let roomUrl = null;

      // === LOGIC FIX: SECURITY CHECK ===
      if (userType === 'Admin') {
        // Admins get the Host URL
        roomUrl = meeting.HostRoomURL;
      } else {
        // Users get the Participant URL
        // Security: Ensure the user trying to join is actually the owner of the meeting
        if (meeting.UserID != userID) {
           return res.status(403).json({ success: false, error: "Unauthorized access to this meeting." });
        }
        roomUrl = meeting.ParticipantURL;
      }

      if (!roomUrl && meeting.MeetingType === 'Online') {
         return res.status(404).json({ success: false, error: "Link not found." });
      }

      res.status(200).json({
        success: true,
        roomUrl: roomUrl,
        meetingType: meeting.MeetingType
      });

    } catch (err) {
      console.error('[CONTROLLER ERROR] Join Meeting:', err);
      res.status(500).json({ success: false, error: "Server Error" });
    }
  }
  // Helper: Fetch Event Details from Calendly API
  static async fetchCalendlyDetails(eventURI) {
    // You need to get a Personal Access Token from: https://calendly.com/integrations/api_webhooks
    const CALENDLY_TOKEN = process.env.CALENDLY_API_TOKEN; 

    try {
      const response = await fetch(eventURI, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CALENDLY_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Calendly API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const resource = data.resource;

      return {
        startTime: resource.start_time,
        endTime: resource.end_time,
        name: resource.name
      };
    } catch (error) {
      console.error("[CALENDLY FETCH ERROR]:", error.message);
      return null;
    }
  }

  // Helper: Call Whereby API
  static async generateWherebyMeeting(endTime) {
    const WHEREBY_API_KEY = process.env.WHEREBY_API_KEY; 

    try {
      const response = await fetch("https://api.whereby.dev/v1/meetings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHEREBY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endDate: endTime,
          isLocked: true,      
          fields: ["hostRoomUrl"]
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(data) || `HTTP Error: ${response.status}`);
      }

      return {
        roomUrl: data.roomUrl,        
        hostRoomUrl: data.hostRoomUrl 
      };

    } catch (error) {
      console.error("[WHEREBY API ERROR]:", error.message);
      return null;
    }
  }

  // Get user's meetings
 static async getUserMeetings(req, res) {
    try {
      // UPDATED: Get userType from params
      const { userID, userType } = req.params;
      
      console.log(`[CONTROLLER] Fetching meetings. Request by ${userType} (ID: ${userID})`);
      
      let meetings;

      // === LOGIC FIX: ROLE BASED DATA ===
      if (userType === 'Admin') {
        // Admin sees ALL meetings from ALL users
        meetings = await Meeting.getAllMeetings();
      } else {
        // Regular User sees ONLY their own meetings
        meetings = await Meeting.getMeetingsByUser(userID);
      }
      
      res.status(200).json({
        success: true,
        meetings: meetings
      });

    } catch (err) {
      console.error('[CONTROLLER ERROR] Failed to fetch meetings:', err);
      res.status(500).json({ success: false, error: "Failed to fetch meetings" });
    }
  }
}

module.exports = MeetingController;