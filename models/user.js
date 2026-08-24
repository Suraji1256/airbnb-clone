const mongoose = require('mongoose');


const userSchema = mongoose.Schema({
  firstName : {type: String, required: true},
  lastName : String,
  email : {type: String, required: true, unique: true},
  password : {type: String, required: true},
  userType : {type: String, enum: ['guest', 'host', 'admin'], required: true, default: 'guest'},
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Home' }]
}, {
    timestamps: true
})


module.exports = mongoose.model('User', userSchema);