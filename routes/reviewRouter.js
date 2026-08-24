const express = require("express");

const router = express.Router();

const reviewController = require("../controller/reviewController");
const isAuth = require("../middleware/isAuth");

router.get(
    "/review/:bookingId",
    isAuth,
    reviewController.getReviewForm
);

router.post(
    "/review",
    isAuth,
    reviewController.postReview
);

router.post(
    "/review/delete/:reviewId",
    isAuth,
    reviewController.deleteReview
);

module.exports = router;