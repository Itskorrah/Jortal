const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const complaintSchema = new mongoose.Schema({
  title: String,
  description: String,
  severity: String,
  status: { type: String, default: "Pending" },
  response: String
}, { timestamps: true });

const Complaint = mongoose.model('Complaint', complaintSchema);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Submit complaint route
app.post('/api/complaint', async (req, res) => {
  const { title, description, severity } = req.body;
  const newComplaint = new Complaint({ title, description, severity });

  try {
    await newComplaint.save();
    console.log("Complaint submitted:", { title, description, severity });

    // Email to admin
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.TO_EMAIL,
      subject: `[GRIEVANCE PORTAL] New Complaint: ${title}`,
      text: `Description: ${description}\nSeverity: ${severity || "Not specified"}\n\nGo to your admin panel to respond.`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending mail:", err);
        res.json({ success: false, message: "Complaint submitted, but failed to send email." });
      } else {
        console.log("Mail sent:", info.response);
        res.json({ success: true, message: "Complaint submitted! Jusband has been notified via email." });
      }
    });
  } catch (e) {
    console.error("Error saving complaint or sending email:", e);
    res.status(500).json({ success: false, message: "Error submitting complaint." });
  }
});

// Admin login (hardcoded)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// Get complaints
app.get('/api/admin/complaints', async (req, res) => {
  const complaints = await Complaint.find().sort({ createdAt: -1 });
  res.json(complaints);
});

// Respond to a complaint
app.post('/api/admin/complaint/respond', async (req, res) => {
  const { id, response, status } = req.body;
  await Complaint.findByIdAndUpdate(id, { response, status });
  res.json({ success: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Backend running on ' + PORT));
