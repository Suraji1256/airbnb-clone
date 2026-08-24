const calculateRefund = (checkIn, totalPrice) => {

    const today = new Date();
    const checkInDate = new Date(checkIn);

    // Create date-only values
    const todayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const checkInOnly = new Date(
        checkInDate.getFullYear(),
        checkInDate.getMonth(),
        checkInDate.getDate()
    );

    // Difference in milliseconds
    const difference =
        checkInOnly.getTime() -
        todayDate.getTime();

    // Difference in calendar days
    const daysUntilCheckIn =
        Math.round(
            difference / (1000 * 60 * 60 * 24)
        );

    console.log("========== REFUND CALCULATION ==========");
    console.log("Today:", todayDate);
    console.log("Check-in:", checkInOnly);
    console.log("Days until check-in:", daysUntilCheckIn);
    console.log("Total price:", totalPrice);


    // --------------------------------
    // 7 or more days → 100% refund
    // --------------------------------

    if (daysUntilCheckIn >= 7) {

        return {
            percentage: 100,
            amount: Number(totalPrice),
            daysUntilCheckIn
        };

    }


    // --------------------------------
    // 3 to 6 days → 50% refund
    // --------------------------------

    if (daysUntilCheckIn >= 3) {

        return {
            percentage: 50,
            amount: Number(totalPrice) * 0.5,
            daysUntilCheckIn
        };

    }


    // --------------------------------
    // Less than 3 days → No refund
    // --------------------------------

    return {
        percentage: 0,
        amount: 0,
        daysUntilCheckIn
    };

};


module.exports = {
    calculateRefund
};