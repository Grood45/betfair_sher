const mongoose = require('mongoose');

const connectDB = async () => {    
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb+srv://messageboxin:K6M6ynyjo5HfIDgj@cluster0.g4qxpl2.mongodb.net';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
