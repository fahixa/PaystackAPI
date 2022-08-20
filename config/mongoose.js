const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/PaystackAPI', { useNewUrlParser: true });

module.exports = {mongoose};