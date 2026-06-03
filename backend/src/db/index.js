const mongoose = require('mongoose');
let connected = false;
async function connect() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('[db] MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  connected = true;
  console.log('[db] Connected to MongoDB:', mongoose.connection.host);
}
async function isSeeded() {
  const User = require('../models/User');
  return (await User.countDocuments()) > 0;
}
module.exports = { connect, isSeeded };
