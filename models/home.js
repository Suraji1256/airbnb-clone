const mongoose = require('mongoose');


const homeSchema = mongoose.Schema({
  houseName : {type: String, required: true},
  price : {type: Number, required: true},
  location : {type: String, required: true},
  
  photo : String,
  description : String,
  propertyType: {
    type: String,
    enum: ["Apartment", "Villa", "House", "Cabin"],
    default: "Apartment"
},

amenities: [{
    type: String
}],
  averageRating: {
    type: Number,
    default: 0
},

reviewCount: {
    type: Number,
    default: 0
},
owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
},
}, {
    timestamps: true
});



// homeSchema.pre('findOneAndDelete', async function(next){
//   const homeId = this.getQuery()._id;
//   await favourite.deleteMany({houseId :homeId});
//   next;
// })

module.exports = mongoose.model('Home', homeSchema);