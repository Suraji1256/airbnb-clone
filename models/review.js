const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({

    home:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Home",
        required:true
    },

    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    booking:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Booking",
        required:true
    },

    rating:{
        type:Number,
        required:true,
        min:1,
        max:5
    },

    comment:{
        type:String,
        required:true,
        trim:true
    }

},{
    timestamps:true
});

module.exports = mongoose.model("Review",reviewSchema);