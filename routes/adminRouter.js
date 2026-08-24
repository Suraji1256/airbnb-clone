const express = require("express");

const router = express.Router();

const adminController = require("../controller/adminController");

const adminMiddleware = require("../middleware/adminMiddleware");


// Protect every admin route
router.use(adminMiddleware);


// Admin Dashboard
router.get(
    "/dashboard",
    adminController.getDashboard
);

router.get(
    "/users",
    adminController.getUsers
);

router.get(
    "/users/:userId",
    adminController.getUserDetails
);

router.get(
    "/homes",
    adminController.getHomes
);

router.get(
    "/bookings",
    adminController.getBookings
);

router.get(
    "/bookings/:bookingId",
    adminController.getBookingDetails
);



router.post(
    "/bookings/:bookingId/cancel",
    adminController.postCancelBooking
);

router.post(
    "/homes/:homeId/delete",
    adminController.postDeleteHome
);

router.post(
    "/users/:userId/change-type",
    adminController.postChangeUserType
);

router.post(
    "/users/:userId/delete",
    adminController.postDeleteUser
);




module.exports = router;