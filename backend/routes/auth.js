const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// register Route
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const user = await User.create({ username, password });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('❌ Registration error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Use the schema method to compare the hashed password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token, username: user.username });
    } catch (err) {
        console.error('❌ Sign-in error:', err);
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
});

module.exports = router;