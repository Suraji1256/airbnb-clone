const express = require("express");

const router = express.Router();

const bookingController = require("../controller/bookingController");
const isAuth = require("../middleware/isAuth");

router.get(
  "/booking/:homeId",
  isAuth,
  bookingController.getBookingForm
);

router.get(
    "/booking/cancel/:bookingId",
    bookingController.getCancelBooking
);

router.post(
    "/booking/cancel/:bookingId",
    bookingController.postCancelBooking
);

router.post(
  "/booking",
  isAuth,
  bookingController.postBooking
);


router.post(
    "/booking/cancel/:bookingId",
    isAuth,
    bookingController.cancelBooking
);

router.post(
    "/booking/delete/:bookingId",
    isAuth,
    bookingController.deleteBooking
);



module.exports = router;