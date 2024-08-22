const express = require('express');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const authMiddleware = require('../middleware/authMiddleware');
const axios = require('axios');
const router = express.Router();

// Clock In
router.post('/clock-in', authMiddleware, async (req, res) => {
  const { lat, lng } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const distance = await getDistanceFromLocation(user.location.coordinates, [lng, lat]);
    if (distance > 100) { // 100 meters threshold
      return res.status(400).json({ msg: 'You are not in the allowed area' });
    }

    let attendance = await Attendance.findOne({ user: user.id, clockOut: null });
    if (attendance) {
      return res.status(400).json({ msg: 'Already clocked in' });
    }

    attendance = new Attendance({ user: user.id, clockIn: new Date() });
    await attendance.save();
    res.json({ msg: 'Clocked in successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Pause Clock
router.post('/pause', authMiddleware, async (req, res) => {
  try {
    const attendance = await Attendance.findOne({ user: req.user.id, clockOut: null, pausedAt: null });
    if (!attendance) {
      return res.status(400).json({ msg: 'No active clock-in record' });
    }

    attendance.pausedAt = new Date();
    await attendance.save();
    res.json({ msg: 'Clock paused successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Resume Clock
router.post('/resume', authMiddleware, async (req, res) => {
  try {
    const attendance = await Attendance.findOne({ user: req.user.id, clockOut: null, pausedAt: { $ne: null } });
    if (!attendance) {
      return res.status(400).json({ msg: 'No paused clock-in record' });
    }

    attendance.resumedAt = new Date();
    await attendance.save();
    res.json({ msg: 'Clock resumed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Clock Out
router.post('/clock-out', authMiddleware, async (req, res) => {
  const { lat, lng } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const distance = await getDistanceFromLocation(user.location.coordinates, [lng, lat]);
    if (distance > 100) { // 100 meters threshold
      return res.status(400).json({ msg: 'You are not in the allowed area' });
    }

    const attendance = await Attendance.findOne({ user: user.id, clockOut: null });
    if (!attendance) {
      return res.status(400).json({ msg: 'No active clock-in record' });
    }

    attendance.clockOut = new Date();
    await attendance.save();
    res.json({ msg: 'Clocked out successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get Total Working Time
router.get('/total-time/:userId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  try {
    const attendances = await Attendance.find({ user: req.params.userId });
    const totalHours = attendances.reduce((acc, record) => {
      if (record.clockOut) {
        let hoursWorked = (new Date(record.clockOut) - new Date(record.clockIn)) / (1000 * 60 * 60);
        if (record.pausedAt && record.resumedAt) {
          hoursWorked -= (new Date(record.resumedAt) - new Date(record.pausedAt)) / (1000 * 60 * 60);
        }
        return acc + hoursWorked;
      }
      return acc;
    }, 0);

    res.json({ totalHours });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

async function getDistanceFromLocation([lng1, lat1], [lng2, lat2]) {
  const response = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json`, {
    params: {
      origins: `${lat1},${lng1}`,
      destinations: `${lat2},${lng2}`,
      key: process.env.GOOGLE_API_KEY
    }
  });
  const distance = response.data.rows[0].elements[0].distance.value; // in meters
  return distance;
}

module.exports = router;
