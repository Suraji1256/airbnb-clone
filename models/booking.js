const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    home: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Home",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    checkIn: {
      type: Date,
      required: true,
    },

    checkOut: {
      type: Date,
      required: true,
    },

    guests: {
      type: Number,
      required: true,
      min: 1,
    },

    totalPrice: {
      type: Number,
      required: true,
    },

    status: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled"],
    default: "Pending",
    },
    paymentStatus: {
    type: String,
    enum: [
        "Pending",
        "Paid",
        "Partially Refunded",
        "Refunded",
        "Failed"
    ],
    default: "Pending"
},
paidAt: {
    type: Date
},
razorpayOrderId: {
    type: String
},

razorpayPaymentId: {
    type: String
},

razorpaySignature: {
    type: String
},

refundStatus: {
    type: String,
    enum: [
        "Not Applicable",
        "Pending",
        "Processed",
        "Failed"
    ],
    default: "Not Applicable"
},

refundAmount: {
    type: Number,
    default: 0
},

refundId: {
    type: String
},

cancelledAt: {
    type: Date
},

cancelledBy: {
    type: String,
    enum: ["Guest", "Host", "Admin"]
}

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);