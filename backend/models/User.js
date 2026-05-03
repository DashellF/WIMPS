// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    // Added to store the user's open files/tabs
    tabs: {
        type: Array,
        default: []
    }
});

// Hash password before saving
userSchema.pre('save', async function() {
    // 1. If password isn't changed, just return (no next needed)
    if (!this.isModified('password')) return;

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // 3. No next() call here! 
    // Mongoose waits for this async function to finish.
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);