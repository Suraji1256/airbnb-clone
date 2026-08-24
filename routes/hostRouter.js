//External Module
const express = require('express');
const hostRouter = express.Router();
//Local Module
const hostController = require('../controller/hostController');
const isAuth = require("../middleware/isAuth");
const isHost = require("../middleware/isHost");

hostRouter.get("/add-home",hostController.getAddHome)

hostRouter.post("/add-home",hostController.postAddHome)

hostRouter.get("/host-home-list",hostController.getHostHomes)

hostRouter.get("/edit-home/:homeId", hostController.getEditHome);

hostRouter.post("/edit-home", hostController.postEditHome);

hostRouter.post("/delete-home/:homeId", hostController.postDeleteHome);

hostRouter.get(
    "/dashboard",
    isAuth,
    isHost,
    hostController.getHostDashboard
);

hostRouter.get(
    "/bookings",
    hostController.getHostBookings
);

hostRouter.get(
    "/bookings/:bookingId",
    hostController.getHostBookingDetails
);

hostRouter.post(
    "/bookings/:bookingId/cancel",
    hostController.postHostCancelBooking
);

hostRouter.post(
    "/bookings/:bookingId/approve",
    hostController.postApproveBooking
);


module.exports = hostRouter;