const Review = require("../models/review");
const Booking = require("../models/booking");
const Home = require("../models/home");
// Change to false in production
const TEST_MODE = true;

// ===============================
// Helper Function
// ===============================

async function updateHomeRating(homeId) {
    const reviews = await Review.find({ home: homeId });

    const reviewCount = reviews.length;

    let averageRating = 0;

    if (reviewCount > 0) {
        const total = reviews.reduce(
            (sum, review) => sum + review.rating,
            0
        );

        averageRating = Number(
            (total / reviewCount).toFixed(1)
        );
    }

    await Home.findByIdAndUpdate(homeId, {
        averageRating,
        reviewCount
    });
}

// ===============================
// Show Review Form
// ===============================

exports.getReviewForm = async (req, res, next) => {

    try {

        const booking = await Booking.findById(req.params.bookingId)
            .populate("home");

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/bookings");
        }

        // Booking must belong to logged in user
        if (booking.user.toString() !== req.session.user.id) {
            req.flash("error", "Unauthorized access.");
            return res.redirect("/bookings");
        }

        // Booking must be confirmed
        if (booking.status !== "Confirmed") {
            req.flash("error", "Cancelled bookings cannot be reviewed.");
            return res.redirect("/bookings");
        }

        if(TEST_MODE){
        // Review only after checkout
            const today = new Date();

        if (today < booking.checkOut) {
            req.flash(
                "error",
                "You can review this property after checkout."
                );
            return res.redirect("/bookings");
            }
        }

        // Prevent duplicate review
        const existingReview = await Review.findOne({
            booking: booking._id
        });

        if (existingReview) {
            req.flash(
                "error",
                "You have already submitted a review."
            );
            return res.redirect("/bookings");
        }

        res.render("review/review-form", {
            pageTitle: "Write Review",
            currentPage: "",
            booking,
            isLoggedIn: req.isLoggedIn,
            user: req.session.user || {}
        });

    } catch (err) {
        next(err);
    }

};

// ===============================
// Submit Review
// ===============================

exports.postReview = async (req, res, next) => {

    try {

        const { bookingId, rating, comment } = req.body;

        const booking = await Booking.findOne({
            _id: bookingId,
            user: req.session.user.id
        });

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/bookings");
        }

        if (booking.status !== "Confirmed") {
            req.flash(
                "error",
                "Cancelled bookings cannot be reviewed."
            );
            return res.redirect("/bookings");
        }

        if(TEST_MODE){
    const today = new Date();

    // Remove time part for accurate comparison
    today.setHours(0, 0, 0, 0);

    const checkOutDate = new Date(booking.checkOut);
    checkOutDate.setHours(0, 0, 0, 0);

    // If today is before checkout, don't allow review
    if (today < checkOutDate) {
        req.flash(
            "error",
            "You can review this property only after your checkout date."
        );
        return res.redirect("/bookings");
    }
}

        const numericRating = Number(rating);

        if (
            isNaN(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            req.flash("error", "Invalid rating.");
            return res.redirect("/bookings");
        }

        if (
            !comment ||
            comment.trim().length < 5
        ) {
            req.flash(
                "error",
                "Comment must contain at least 5 characters."
            );
            return res.redirect("/bookings");
        }

        const existingReview = await Review.findOne({
            booking: booking._id
        });

        if (existingReview) {
            req.flash(
                "error",
                "You have already reviewed this booking."
            );
            return res.redirect("/bookings");
        }

        await Review.create({

            booking: booking._id,

            home: booking.home,

            user: booking.user,

            rating: numericRating,

            comment: comment.trim()

        });

        await updateHomeRating(booking.home);

        req.flash(
            "success",
            "Review submitted successfully."
        );

        res.redirect("/bookings");

    } catch (err) {

        next(err);

    }

};

// ===============================
// Delete Review
// ===============================

exports.deleteReview = async (req, res, next) => {

    try {

        const review = await Review.findOne({

            _id: req.params.reviewId,

            user: req.session.user.id

        });

        if (!review) {

            req.flash(
                "error",
                "Review not found."
            );

            return res.redirect("/bookings");

        }

        const homeId = review.home;

        await Review.findByIdAndDelete(review._id);

        await updateHomeRating(homeId);

        req.flash(
            "success",
            "Review deleted successfully."
        );

        res.redirect("/bookings");

    } catch (err) {

        next(err);

    }

}; 