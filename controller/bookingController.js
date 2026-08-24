const Home = require("../models/home");
const Booking = require("../models/booking");
const razorpay = require("../utils/razorpay");
const {
    calculateRefund
} = require("../utils/cancellationPolicy");

// ===================================
// Show Booking Form
// ===================================

exports.getBookingForm = async (req, res, next) => {
    try {

        const home = await Home.findById(req.params.homeId).lean();

        if (!home) {
            req.flash("error", "Home not found.");
            return res.redirect("/homes");
        }

        res.render("booking/booking-form", {
            pageTitle: "Reserve Home",
            currentPage: "",
            home,
            isLoggedIn: req.isLoggedIn,
            user: req.session.user || {}
        });

    } catch (err) {
        next(err);
    }
};

// ===================================
// Save Booking
// ===================================

exports.postBooking = async (req, res, next) => {
    try {
        const { homeId, checkIn, checkOut, guests } = req.body;

        // ==========================================
        // 1. CHECK LOGIN
        // ==========================================

        if (!req.session.user) {
            req.flash("error", "Please login first.");
            return res.redirect("/login");
        }


        // ==========================================
        // 2. FIND HOME
        // ==========================================

        const home = await Home.findById(homeId);

        if (!home) {
            req.flash("error", "Home not found.");
            return res.redirect("/homes");
        }


        // ==========================================
        // 3. CONVERT DATES
        // ==========================================

        const start = new Date(checkIn);
        const end = new Date(checkOut);


        // ==========================================
        // 4. VALIDATE DATES
        // ==========================================

        if (
            isNaN(start.getTime()) ||
            isNaN(end.getTime())
        ) {
            req.flash(
                "error",
                "Invalid booking dates."
            );

            return res.redirect(`/booking/${homeId}`);
        }


        // ==========================================
        // 5. CHECK-IN CANNOT BE IN THE PAST
        // ==========================================

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        if (start < today) {
            req.flash(
                "error",
                "Check-in date cannot be in the past."
            );

            return res.redirect(`/booking/${homeId}`);
        }


        // ==========================================
        // 6. CHECK-OUT MUST BE AFTER CHECK-IN
        // ==========================================

        if (end <= start) {
            req.flash(
                "error",
                "Check-out date must be after check-in."
            );

            return res.redirect(`/booking/${homeId}`);
        }


        // ==========================================
        // 7. VALIDATE GUESTS
        // ==========================================

        const guestCount = Number(guests);

        if (
            !Number.isInteger(guestCount) ||
            guestCount < 1 ||
            guestCount > 20
        ) {
            req.flash(
                "error",
                "Guest count must be between 1 and 20."
            );

            return res.redirect(`/booking/${homeId}`);
        }


        // ==========================================
        // 8. CHECK FOR BOOKING CONFLICT
        // ==========================================

        /*
            Existing booking:

            existing.checkIn < new.checkOut
            AND
            existing.checkOut > new.checkIn

            If both are true,
            the dates overlap.
        */

        const existingBooking = await Booking.findOne({

            home: home._id,

            status: {
                $in: ["Pending", "Confirmed"]
            },

            checkIn: {
                $lt: end
            },

            checkOut: {
                $gt: start
            }

        }).lean();


        // ==========================================
        // 9. REJECT OVERLAPPING BOOKING
        // ==========================================

        if (existingBooking) {

            req.flash(
                "error",
                "This property is already booked for the selected dates."
            );

            return res.redirect(`/booking/${homeId}`);
        }


        // ==========================================
        // 10. CALCULATE NUMBER OF NIGHTS
        // ==========================================

        const millisecondsPerDay =
            1000 * 60 * 60 * 24;

        const nights = Math.ceil(
            (end - start) / millisecondsPerDay
        );

        if (nights <= 0) {
            req.flash(
                "error",
                "Invalid booking duration."
            );

            return res.redirect(`/booking/${homeId}`);
        }


        // ==========================================
        // 11. VALIDATE HOME PRICE
        // ==========================================

        const pricePerNight = Number(home.price);

        if (
            !Number.isFinite(pricePerNight) ||
            pricePerNight < 0
        ) {
            req.flash(
                "error",
                "Invalid property price."
            );

            return res.redirect(`/booking/${homeId}`);
        }


        // ==========================================
        // 12. CALCULATE TOTAL PRICE
        // ==========================================

        const totalPrice =
            nights * pricePerNight;


        // ==========================================
        // 13. CREATE BOOKING
        // ==========================================

        const booking = new Booking({

            home: home._id,

            user: req.session.user.id,

            checkIn: start,

            checkOut: end,

            guests: guestCount,

            totalPrice: totalPrice,

            status: "Pending"

        });


        // ==========================================
        // 14. SAVE BOOKING
        // ==========================================

        await booking.save();


        // ==========================================
        // 15. SUCCESS MESSAGE
        // ==========================================

        req.flash(
            "success",
            `${home.houseName} booked successfully!`
        );


        // ==========================================
        // 16. REDIRECT TO BOOKINGS
        // ==========================================

        return res.redirect("/bookings");


    } catch (err) {

        console.error(
            "Booking Creation Error:",
            err
        );

        next(err);
    }
};

// ===================================
// Cancel Booking
// ===================================

exports.cancelBooking = async (req, res, next) => {

    try {

        const booking = await Booking.findOne({

            _id: req.params.bookingId,

            user: req.session.user.id

        });

        if (!booking) {

            req.flash(
                "error",
                "Booking not found."
            );

            return res.redirect("/bookings");

        }

        if (booking.status === "Cancelled") {

            req.flash(
                "error",
                "Booking is already cancelled."
            );

            return res.redirect("/bookings");

        }

        booking.status = "Cancelled";

        await booking.save();

        req.flash(
            "success",
            "Booking cancelled successfully."
        );

        res.redirect("/bookings");

    } catch (err) {

        next(err);

    }

};

exports.deleteBooking = async (req, res, next) => {
    try {

        const booking = await Booking.findOne({
            _id: req.params.bookingId,
            user: req.session.user.id
        });

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/bookings");
        }

        await Booking.findByIdAndDelete(booking._id);

        req.flash("success", "Booking deleted successfully.");

        res.redirect("/bookings");

    } catch (err) {
        next(err);
    }
};


exports.getCancelBooking = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const bookingId = req.params.bookingId;
        const userId = req.session.user.id;

        const booking = await Booking.findById(bookingId)
            .populate("home");

        if (!booking) {
            return res.redirect("/bookings");
        }

        if (booking.user.toString() !== userId.toString()) {
            return res.status(403).send("Unauthorized");
        }

        if (
            booking.status !== "Pending" &&
            booking.status !== "Confirmed"
        ) {
            return res.redirect("/bookings");
        }

        const refund = calculateRefund(
            booking.checkIn,
            booking.totalPrice
        );

        res.render("store/cancel-booking", {
            booking,
            refundPercentage: refund.percentage,
            refundAmount: refund.amount,
            pageTitle: "Cancel Booking",
            currentPage: "bookings",
            isLoggedIn: req.isLoggedIn,
            user: req.session.user || {}
        });

    } catch (err) {
        console.log("Cancel Booking Page Error:", err);
        next(err);
    }
};

exports.postCancelBooking = async (req, res, next) => {
    console.log("🔥 POST CANCEL BOOKING CALLED");

    try {

        // --------------------------------
        // 1. Check login
        // --------------------------------

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const bookingId = req.params.bookingId;
        const userId = req.session.user.id;


        // --------------------------------
        // 2. Find booking
        // --------------------------------

        const booking = await Booking.findById(bookingId)
            .populate("home");

        if (!booking) {
            return res.status(404).send("Booking not found");
        }


        // --------------------------------
        // 3. Ownership check
        // --------------------------------

        if (
            booking.user.toString() !==
            userId.toString()
        ) {
            return res.status(403).send("Unauthorized");
        }


        // --------------------------------
        // 4. Already cancelled?
        // --------------------------------

        if (booking.status === "Cancelled") {
            return res.redirect("/bookings");
        }


        // --------------------------------
        // 5. Only Pending / Confirmed
        // --------------------------------

        if (
            booking.status !== "Pending" &&
            booking.status !== "Confirmed"
        ) {
            return res.redirect("/bookings");
        }


        // --------------------------------
        // 6. Calculate refund
        // --------------------------------

       const refund = calculateRefund(
    booking.checkIn,
    booking.totalPrice
);

const refundAmount = Math.round(
    refund.amount
);

console.log("🔥 FINAL REFUND:", {
    percentage: refund.percentage,
    refundAmount: refundAmount,
    totalPrice: booking.totalPrice,
    paymentStatus: booking.paymentStatus,
    razorpayPaymentId: booking.razorpayPaymentId
});


        // --------------------------------
        // 7. Save cancellation information
        // --------------------------------

        booking.status = "Cancelled";

        booking.cancelledAt = new Date();

        booking.cancelledBy = "Guest";

        booking.refundAmount = refundAmount;


        // --------------------------------
        // 8. No refund
        // --------------------------------

        if (refundAmount <= 0) {

            booking.refundStatus = "Not Applicable";

            await booking.save();

            console.log(
                "Booking cancelled - no refund"
            );

            return res.redirect("/bookings");
        }


        // --------------------------------
        // 9. Check payment
        // --------------------------------

        if (
            booking.paymentStatus !== "Paid" ||
            !booking.razorpayPaymentId
        ) {

            /*
             * Booking is cancelled,
             * but there is no successful
             * Razorpay payment to refund.
             */

            booking.refundAmount = 0;

            booking.refundStatus =
                "Not Applicable";

            await booking.save();

            console.log(
                "Booking cancelled - no paid payment found"
            );

            return res.redirect("/bookings");
        }


        // --------------------------------
        // 10. Prevent duplicate refund
        // --------------------------------

        if (
            booking.refundStatus === "Pending" ||
            booking.refundStatus === "Processed"
        ) {

            return res.redirect("/bookings");
        }


        // --------------------------------
        // 11. Mark refund as pending
        // --------------------------------

        booking.refundStatus = "Pending";

        await booking.save();


        // --------------------------------
        // 12. Create Razorpay refund
        // --------------------------------

        try {

            const refundResponse =
                await razorpay.payments.refund(
                    booking.razorpayPaymentId,
                    {
                        amount: refundAmount * 100,

                        notes: {
                            bookingId:
                                booking._id.toString(),

                            reason:
                                "Guest cancellation"
                        }
                    }
                );


            console.log(
                "Razorpay Refund Response:",
                refundResponse
            );


            // --------------------------------
            // 13. Store Razorpay refund ID
            // --------------------------------

            booking.refundId =
                refundResponse.id;


            // --------------------------------
            // 14. Check Razorpay status
            // --------------------------------

            if (
                refundResponse.status ===
                "processed"
            ) {

                booking.refundStatus =
                    "Processed";


                if (
                    refundAmount >=
                    booking.totalPrice
                ) {

                    booking.paymentStatus =
                        "Refunded";

                } else {

                    booking.paymentStatus =
                        "Partially Refunded";
                }

            } else {

                /*
                 * Razorpay accepted the refund
                 * but it is still processing.
                 */

                booking.refundStatus =
                    "Pending";
            }


            // --------------------------------
            // 15. Save refund result
            // --------------------------------

            await booking.save();


        } catch (refundError) {

            console.log(
                "Razorpay Refund Failed:",
                refundError
            );


            // Booking remains cancelled,
            // but refund failed.

            booking.refundStatus = "Failed";

            await booking.save();

        }

        req.session.flash = {
    type: "error",
    message: "Booking cancelled, but the refund could not be processed. Please contact support."
};


        // --------------------------------
        // 16. Redirect
        // --------------------------------

        return res.redirect("/bookings");


    } catch (err) {

        console.log(
            "Cancellation Error:",
            err
        );

        next(err);
    }

};