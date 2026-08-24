const crypto = require("crypto");

const Booking = require("../models/booking");
const razorpay = require("../utils/razorpay");


exports.createOrder = async (req, res, next) => {

    try {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const bookingId = req.params.bookingId;

        const userId = req.session.user.id;


        // Find booking
        const booking = await Booking.findById(bookingId)
            .populate("home");


        if (!booking) {
            return res.status(404).send("Booking not found");
        }


        // Make sure booking belongs to logged-in guest
        if (
            booking.user.toString() !== userId.toString()
        ) {
            return res.status(403).send("Unauthorized");
        }


        // Only pending bookings can be paid
        if (booking.status !== "Pending") {
            return res.redirect("/bookings");
        }


        // Already paid
        if (booking.paymentStatus === "Paid") {
            return res.redirect("/bookings");
        }


        // Razorpay amount is in paise
        const amount = Math.round(
            booking.totalPrice * 100
        );


        const options = {

            amount: amount,

            currency: "INR",

            receipt: `booking_${booking._id}`,

            notes: {
                bookingId: booking._id.toString()
            }

        };


        const order = await razorpay.orders.create(options);


        // Save Razorpay order ID
        booking.razorpayOrderId = order.id;

        await booking.save();


        res.render("payment/checkout", {
    booking: booking,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId: order.id,
    amount: amount,
    pageTitle: "Payment",

    currentPage: "payment",

    isLoggedIn: req.isLoggedIn,
    user: req.session.user || {}
});


    } catch (err) {

        console.log("Create Razorpay Order Error:", err);

        next(err);

    }

};


exports.verifyPayment = async (req, res, next) => {

    try {

        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Login required"
            });
        }


        const {
            bookingId,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
        } = req.body || {};


        // Validate payment data
        if (
            !bookingId ||
            !razorpay_payment_id ||
            !razorpay_order_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                success: false,
                message: "Incomplete payment information"
            });
        }


        // Find booking
        const booking = await Booking.findById(bookingId);


        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }


        // Check booking ownership
        if (
            booking.user.toString() !==
            req.session.user.id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }


        // Already paid
        if (booking.paymentStatus === "Paid") {
            return res.json({
                success: true,
                message: "Payment already verified"
            });
        }


        // Check server-side Razorpay order
        if (!booking.razorpayOrderId) {
            return res.status(400).json({
                success: false,
                message: "Payment order not found"
            });
        }


        // Make sure returned order belongs to this booking
        if (
            razorpay_order_id !==
            booking.razorpayOrderId
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid Razorpay order"
            });
        }


        // Generate signature
        const generatedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(
                    booking.razorpayOrderId +
                    "|" +
                    razorpay_payment_id
                )
                .digest("hex");


        // Compare signatures
        const signaturesMatch =
            crypto.timingSafeEqual(
                Buffer.from(generatedSignature, "utf8"),
                Buffer.from(razorpay_signature, "utf8")
            );


        if (!signaturesMatch) {

            booking.paymentStatus = "Failed";
            

            await booking.save();

            return res.status(400).json({
                success: false,
                message: "Invalid payment signature"
            });
        }


        // Store payment information
        booking.razorpayPaymentId =
            razorpay_payment_id;

        booking.razorpaySignature =
            razorpay_signature;

        booking.paymentStatus = "Paid";

        booking.paidAt = new Date();

        booking.status = "Confirmed";


        await booking.save();


        return res.json({
            success: true,
            message: "Payment verified successfully"
        });


    } catch (err) {

        console.error(
            "Payment Verification Error:",
            err
        );

        next(err);
    }
};

exports.getPaymentHistory = async (req, res, next) => {
    try {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;

        const payments = await Booking.find({
            user: userId,
            paymentStatus: "Paid"
        })
        .populate("home")
        .sort({
            paidAt: -1
        });

        res.render("payment/history", {

            payments,

            pageTitle: "Payment History",

            currentPage: "payment-history",

            isLoggedIn: req.isLoggedIn,

            user: req.session.user || {}

        });

    } catch (err) {

        console.log(
            "Payment History Error:",
            err
        );

        next(err);

    }
};

exports.getReceipt = async (req, res, next) => {
    try {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;

        const bookingId = req.params.bookingId;


        const booking = await Booking.findOne({
            _id: bookingId,
            user: userId,
            paymentStatus: "Paid"
        })
        .populate("home")
        .populate("user");


        if (!booking) {

            return res.status(404).send(
                "Payment receipt not found"
            );

        }


        res.render("payment/receipt", {

            booking,

            pageTitle: "Payment Receipt",

            currentPage: "payment-history",

            isLoggedIn: req.isLoggedIn,

            user: req.session.user || {}

        });

    } catch (err) {

        console.log(
            "Receipt Error:",
            err
        );

        next(err);

    }
};



exports.checkRefundStatus = async (req, res, next) => {

    try {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const bookingId = req.params.bookingId;

        const userId = req.session.user.id;


        // -----------------------------
        // Find booking
        // -----------------------------

        const booking = await Booking.findById(
            bookingId
        );


        if (!booking) {
            return res.status(404).send(
                "Booking not found"
            );
        }


        // -----------------------------
        // Security check
        // -----------------------------

        if (
            booking.user.toString() !==
            userId.toString()
        ) {

            return res.status(403).send(
                "Unauthorized"
            );

        }


        // -----------------------------
        // Check refund ID
        // -----------------------------

        if (!booking.refundId) {

            return res.status(400).send(
                "Refund not found"
            );

        }


        // -----------------------------
        // Fetch refund from Razorpay
        // -----------------------------

        const refund =
            await razorpay.refunds.fetch(
                booking.refundId
            );


        console.log(
            "Razorpay Refund Status:",
            refund.status
        );


        // -----------------------------
        // Update MongoDB
        // -----------------------------

        if (refund.status === "processed") {

            booking.refundStatus =
                "Processed";


            if (
                booking.refundAmount >=
                booking.totalPrice
            ) {

                booking.paymentStatus =
                    "Refunded";

            } else {

                booking.paymentStatus =
                    "Partially Refunded";

            }

        }


        else if (refund.status === "failed") {

            booking.refundStatus =
                "Failed";

        }


        else {

            booking.refundStatus =
                "Pending";

        }


        await booking.save();


        // -----------------------------
        // Return result
        // -----------------------------

        return res.json({
    success: true,
    refundStatus: booking.refundStatus,
    paymentStatus: booking.paymentStatus,
    refundAmount: booking.refundAmount
});


    } catch (err) {

        console.log(
            "Check Refund Status Error:",
            err
        );

        next(err);

    }

};