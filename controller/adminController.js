const User = require("../models/user");
const Home = require("../models/home");
const Booking = require("../models/booking");
const Review = require("../models/review");

exports.getDashboard = async (req, res, next) => {

    try {

        const [
            totalUsers,
            totalHomes,
            totalBookings,
            confirmedBookings
        ] = await Promise.all([

            User.countDocuments(),

            Home.countDocuments(),

            Booking.countDocuments(),

            Booking.countDocuments({
                status: "Confirmed"
            })

        ]);


        // Total revenue from confirmed bookings
        const revenueResult = await Booking.aggregate([

            {
                $match: {
                    status: "Confirmed"
                }
            },

            {
                $group: {
                    _id: null,
                    total: {
                        $sum: "$totalPrice"
                    }
                }
            }

        ]);


        const totalRevenue =
            revenueResult.length > 0
                ? revenueResult[0].total
                : 0;


        res.render("admin/dashboard", {

            pageTitle: "Admin Dashboard",

            currentPage: "admin-dashboard",

            isLoggedIn: true,

            user: req.session.user,

            totalUsers,

            totalHomes,

            totalBookings,

            confirmedBookings,

            totalRevenue

        });

    } catch (err) {

        console.log("Admin Dashboard Error:", err);

        next(err);

    }

};

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

exports.getUsers = async (req, res, next) => {
    try {

        const {
            search = "",
            userType = "",
            sort = "newest"
        } = req.query;


        // Build filter
        const filter = {};


        // Search by first name, last name or email
        if (search.trim()) {

            const searchRegex = new RegExp(
                escapeRegex(search.trim()),
                    "i"
            );

            filter.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex }
            ];
        }


        // Filter by user type
        if (userType) {

            filter.userType = userType;

        }


        // Sorting
        let sortOption = {
            createdAt: -1
        };

        if (sort === "oldest") {

            sortOption = {
                createdAt: 1
            };

        } else if (sort === "name") {

            sortOption = {
                firstName: 1
            };

        }


        const users = await User.find(filter)
            .select("-password")
            .sort(sortOption);


        res.render("admin/users", {

            users,

            pageTitle: "Manage Users",

            currentPage: "admin-users",

            isLoggedIn: true,

            user: req.session.user,

            queryError: req.query.error,

            querySuccess: req.query.success,

            search,

            userType,

            sort

        });


    } catch (err) {

        console.log("Admin Users Error:", err);

        next(err);

    }
};

exports.getUserDetails = async (req, res, next) => {
    try {

        const userId = req.params.userId;

        // Find user
        const selectedUser = await User.findById(userId)
            .select("-password");

        if (!selectedUser) {
            return res.status(404).send("User not found");
        }


        // Find properties owned by this user
        const homes = await Home.find({
            owner: userId
        }).sort({
            createdAt: -1
        });


        // Find bookings made by this user
        const bookings = await Booking.find({
            user: userId
        })
        .populate("home")
        .sort({
            createdAt: -1
        });


        res.render("admin/user-details", {

            pageTitle: "User Details",

            currentPage: "admin-users",

            isLoggedIn: true,

            // Logged-in admin
            user: req.session.user,

            // User being viewed
            selectedUser,

            homes,

            bookings

        });

    } catch (err) {

        console.log("Admin User Details Error:", err);

        next(err);

    }
};



exports.postChangeUserType = async (req, res, next) => {
    try {

        // Make sure admin is logged in
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const adminId = req.session.user.id;
        const userId = req.params.userId;
        const { userType } = req.body;


        // -----------------------------------------
        // Validate userType
        // -----------------------------------------

        const allowedTypes = ["guest", "host", "admin"];

        if (!allowedTypes.includes(userType)) {
            return res.status(400).send("Invalid user type");
        }


        // -----------------------------------------
        // Prevent admin from changing themselves
        // -----------------------------------------

        if (adminId.toString() === userId.toString()) {
            return res.status(400).send(
                "You cannot change your own user type."
            );
        }


        // -----------------------------------------
        // Find user
        // -----------------------------------------

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send("User not found");
        }


        // -----------------------------------------
        // Change user type
        // -----------------------------------------

        user.userType = userType;

        await user.save();


        // -----------------------------------------
        // Back to users
        // -----------------------------------------

        res.redirect("/admin/users");

    } catch (err) {

        console.log("Change User Type Error:", err);

        next(err);

    }
};

exports.postDeleteUser = async (req, res, next) => {
    try {

        // -----------------------------------------
        // 1. Check admin login
        // -----------------------------------------

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const adminId = req.session.user.id;
        const userId = req.params.userId;


        // -----------------------------------------
        // 2. Prevent admin deleting himself
        // -----------------------------------------

        if (adminId.toString() === userId.toString()) {

            return res.status(400).send(
                "You cannot delete your own admin account."
            );

        }


        // -----------------------------------------
        // 3. Find the user
        // -----------------------------------------

        const user = await User.findById(userId);

        if (!user) {

            return res.redirect(
                "/admin/users?error=userNotFound"
            );

        }


        // -----------------------------------------
        // 4. Check if user owns properties
        // -----------------------------------------

        const ownedHome = await Home.findOne({
            owner: userId
        });

        if (ownedHome) {

            return res.redirect(
                "/admin/users?error=ownsProperty"
            );

        }


        // -----------------------------------------
        // 5. Check active/future bookings
        // -----------------------------------------

        const activeBooking = await Booking.findOne({

            user: userId,

            status: {
                $in: ["Pending", "Confirmed"]
            },

            checkOut: {
                $gte: new Date()
            }

        });

        if (activeBooking) {

            return res.redirect(
                "/admin/users?error=activeBooking"
            );

        }


        // -----------------------------------------
        // 6. Remove user from favourites
        // -----------------------------------------

        await User.updateMany(

            {
                favourites: userId
            },

            {
                $pull: {
                    favourites: userId
                }
            }

        );


        // -----------------------------------------
        // 7. Delete user
        // -----------------------------------------

        await User.deleteOne({
            _id: userId
        });


        // -----------------------------------------
        // 8. Redirect
        // -----------------------------------------

        res.redirect(
            "/admin/users?success=userDeleted"
        );


    } catch (err) {

        console.log(
            "Admin Delete User Error:",
            err
        );

        next(err);

    }
};



exports.getHomes = async (req, res, next) => {
    try {

        const homes = await Home.find()
            .populate("owner", "name email")
            .sort({
                createdAt: -1
            });

        res.render("admin/homes", {

    homes,

    pageTitle: "Manage Properties",

    currentPage: "admin-homes",

    isLoggedIn: true,

    user: req.session.user,

    queryError: req.query.error,

    querySuccess: req.query.success

});

    } catch (err) {

        console.log("Admin Homes Error:", err);

        next(err);

    }
};



exports.postDeleteHome = async (req, res, next) => {
    try {

        const homeId = req.params.homeId;


        // -----------------------------------------
        // 1. Find the property
        // -----------------------------------------

        const home = await Home.findById(homeId);

        if (!home) {
            return res.redirect(
                "/admin/homes?error=homeNotFound"
            );
        }


        // -----------------------------------------
        // 2. Check active/future bookings
        // -----------------------------------------

        const activeBooking = await Booking.findOne({
            home: homeId,

            status: {
                $in: ["Pending", "Confirmed"]
            },

            checkOut: {
                $gte: new Date()
            }
        });

        if (activeBooking) {

            return res.redirect(
                "/admin/homes?error=activeBooking"
            );

        }


        // -----------------------------------------
        // 3. Remove property from favourites
        // -----------------------------------------

        await User.updateMany(
            {
                favourites: homeId
            },
            {
                $pull: {
                    favourites: homeId
                }
            }
        );


        // -----------------------------------------
        // 4. Delete old bookings
        // -----------------------------------------

        await Booking.deleteMany({
            home: homeId
        });

        // Delete reviews
        await Review.deleteMany({
            home: homeId
        });


        // -----------------------------------------
        // 5. Delete the property
        // -----------------------------------------

        await Home.deleteOne({
            _id: homeId
        });


        // -----------------------------------------
        // 6. Redirect
        // -----------------------------------------

        res.redirect(
            "/admin/homes?success=homeDeleted"
        );

    } catch (err) {

        console.log(
            "Admin Delete Home Error:",
            err
        );

        next(err);
    }
};



exports.getBookings = async (req, res, next) => {
    try {

        const bookings = await Booking.find()
            .populate("user", "name email")
            .populate({
                path: "home",
                populate: {
                    path: "owner",
                    select: "name email"
                }
            })
            .sort({
                createdAt: -1
            });


        res.render("admin/bookings", {

            bookings,

            pageTitle: "Manage Bookings",

            currentPage: "admin-bookings",

            isLoggedIn: true,

            user: req.session.user

        });

    } catch (err) {

        console.log(
            "Admin Bookings Error:",
            err
        );

        next(err);

    }
};



exports.getBookingDetails = async (req, res, next) => {
    try {

        const bookingId = req.params.bookingId;

        const booking = await Booking.findById(bookingId)
            .populate("user", "name email")
            .populate({
                path: "home",
                populate: {
                    path: "owner",
                    select: "name email"
                }
            });

        if (!booking) {
            return res.redirect(
                "/admin/bookings?error=bookingNotFound"
            );
        }

        res.render("admin/booking-detail", {

    booking,

    pageTitle: "Booking Details",

    currentPage: "admin-bookings",

    isLoggedIn: true,

    user: req.session.user,

    queryError: req.query.error,

    querySuccess: req.query.success

});

    } catch (err) {

        console.log(
            "Admin Booking Details Error:",
            err
        );

        next(err);

    }
};



exports.postCancelBooking = async (req, res, next) => {
    try {

        const bookingId = req.params.bookingId;

        // Find booking
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.redirect(
                "/admin/bookings?error=bookingNotFound"
            );
        }

        // Already cancelled
        if (booking.status === "Cancelled") {
            return res.redirect(
                `/admin/bookings/${bookingId}?error=alreadyCancelled`
            );
        }

        // Only confirmed bookings can be cancelled
        if (booking.status !== "Confirmed") {
            return res.redirect(
                `/admin/bookings/${bookingId}?error=invalidStatus`
            );
        }

        // Cancel booking
        booking.status = "Cancelled";

        await booking.save();

        console.log(
            `Admin cancelled booking: ${bookingId}`
        );

        res.redirect(
            `/admin/bookings/${bookingId}?success=bookingCancelled`
        );

    } catch (err) {

        console.log(
            "Admin Cancel Booking Error:",
            err
        );

        next(err);
    }
};