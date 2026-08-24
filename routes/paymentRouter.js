const express = require("express");

const paymentController =
    require("../controller/paymentController");

const router = express.Router();


router.post(
    "/create-order/:bookingId",
    paymentController.createOrder
);

router.post(
    "/verify",
    paymentController.verifyPayment
);

router.get(
    "/history",
    paymentController.getPaymentHistory
);

router.get(
    "/receipt/:bookingId",
    paymentController.getReceipt
);

router.get(
    "/refund-status/:bookingId",
    paymentController.checkRefundStatus
);


module.exports = router;