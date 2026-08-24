const Home = require("../models/home");
const fs = require('fs');
const User = require("../models/user");
const Booking = require("../models/booking");

exports.getAddHome = (req, res, next)=>{
    res.render('host/edit-home', {pageTitle : 'Add Home To airbnb', currentPage : 'addHome',
        editing: false, 
        isLoggedIn : req.isLoggedIn,
        user: req.session.user || {}
    });
}

exports.getEditHome = (req, res, next)=>{
    const homeId = req.params.homeId;
    const editing = req.query.editing === 'true';

    Home.findOne({
    _id: homeId,
    owner: req.session.user.id
}).then( home => {
        if(!home) {
            console.log("Home not found for editing");
            return res.redirect("/host/host-home-list")
        }
        console.log(homeId, editing, home);
        res.render('host/edit-home', {
            home : home,
            pageTitle : 'Edit Your Home', currentPage : 'host-homes', editing : editing,
            isLoggedIn : req.isLoggedIn,
            user: req.session.user || {}
        });
    })
}

exports.getHostHomes = (req, res, next)=>{
   Home.find({
    owner: req.session.user.id
}).then(registeredHomes => { 
        res.render('host/host-home-list', {
            registeredHomes:registeredHomes, pageTitle : 'Host  Homes List',
            currentPage : 'host-homes',
            isLoggedIn : req.isLoggedIn,
            user: req.session.user || {},
            queryError: req.query.error,
            querySuccess: req.query.success
            }
        )}
    );
    
}

exports.postAddHome = async (req, res, next) => {

    try {

        const {
            houseName,
            price,
            location,
            description,
            propertyType,
            amenities
        } = req.body;

        console.log("File:", req.file);

        if (!req.file) {
            console.log("No file uploaded");
            return res.status(400).send("No file uploaded.");
        }

        const photo = "/uploads/" + req.file.filename;

        const home = new Home({

            houseName,

            price,

            location,

            photo,

            description,

            propertyType,

            amenities: amenities
                ? (Array.isArray(amenities)
                    ? amenities
                    : [amenities])
                : [],

            owner: req.session.user.id

        });

        await home.save();

        console.log("Home Saved Successfully");

        res.redirect("/host/host-home-list");

    } catch (err) {

        console.log("Error saving home:", err);

        next(err);
    }
};

exports.postEditHome = async (req, res, next) => {
    try {
        const {
    id,
    houseName,
    price,
    location,
    description,
    propertyType,
    amenities
} = req.body;
        // Find home
        const home = await Home.findOne({
    _id: id,
    owner: req.session.user.id
});

        // Home not found
        if (!home) {
            console.log("Home not found:", id);
            return res.redirect("/host/host-home-list");
        }

        // Update fields
        home.houseName = houseName;
        home.price = price;
        home.location = location;
        home.propertyType = propertyType;

        home.amenities = amenities
        ? (Array.isArray(amenities) ? amenities : [amenities])
        : [];
        home.description = description;

        // Update photo only if a new photo was uploaded
        if (req.file) {
            fs.unlink(home.photo, (err) => {
                if (err) {
                    console.error("Error deleting old photo:", err);
                }
            });
            home.photo = req.file.path;
        }

        // Save changes
        const result = await home.save();

        console.log("Home Updated:", result);

        // Redirect only after save succeeds
        res.redirect("/host/host-home-list");

    } catch (err) {
        console.log("Error while updating home:", err);

        return res.status(500).send("Unable to update home");
    }
};

// exports.postDeleteHome = (req, res, next)=>{
//     const homeId = req.params.homeId;
//     console.log("Came to delete",homeId);
//     Home.findOneAndDelete({
//     _id: homeId,
//     owner: req.session.user.id
// }).then(() => {
//         res.redirect('/host/host-home-list');
//     }).catch(error =>{
//         console.log('Error while deleting ', error);
//     })

// }

//



exports.postDeleteHome = async (req, res, next) => {
    try {

        // 1. Check login
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;
        const homeId = req.params.homeId;


        // 2. Find the home AND verify ownership
        const home = await Home.findOne({
            _id: homeId,
            owner: userId
        });

        // Property doesn't exist or doesn't belong to host
        if (!home) {
            return res.status(403).send("Unauthorized");
        }


        // 3. Check for active/future bookings
        const activeBooking = await Booking.findOne({
            home: homeId,

            status: {
                $in: ["Pending", "Confirmed"]
            },

            checkOut: {
                $gte: new Date()
            }
        });


        // 4. Block deletion if booking exists
        if (activeBooking) {

            console.log(
                "Cannot delete home because it has an active/future booking."
            );

            return res.redirect(
                `/host/host-home-list?error=activeBooking`
            );
        }


        // 5. Remove this home from users' favourites
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


        // 6. Delete the property
        await Home.deleteOne({
            _id: homeId
        });


        console.log("Home deleted successfully:", homeId);


        // 7. Redirect back to host property list
        res.redirect(
            "/host/host-home-list?success=deleted"
        );

    } catch (err) {

        console.log("Delete Home Error:", err);

        next(err);
    }
};







exports.getHostDashboard = async (req, res, next) => {
    try {

        // Check login
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;


        // ==========================================
        // 1. GET HOST'S PROPERTIES
        // ==========================================

        const homes = await Home.find({
            owner: userId
        }).sort({
            createdAt: -1
        });


        // ==========================================
        // 2. TOTAL PROPERTIES
        // ==========================================

        const totalProperties = homes.length;


        // ==========================================
        // 3. AVERAGE RATING
        // ==========================================

        let averageRating = 0;

        if (homes.length > 0) {

            const totalRating = homes.reduce(
                (sum, home) => sum + (home.averageRating || 0),
                0
            );

            averageRating = totalRating / homes.length;
        }


        // ==========================================
        // 4. GET HOST PROPERTY IDS
        // ==========================================

        const homeIds = homes.map(home => home._id);


        // ==========================================
        // 5. GET BOOKINGS FOR HOST'S PROPERTIES
        // ==========================================

        const bookings = await Booking.find({
            home: { $in: homeIds }
        })
        .populate("home")
        .populate("user")
        .sort({
            createdAt: -1
        });


        // ==========================================
        // 6. TOTAL BOOKINGS
        // ==========================================

        const totalBookings = bookings.length;


        // ==========================================
        // 7. TOTAL REVENUE
        // ==========================================

        const totalRevenue = bookings
    .filter(
        booking =>
            booking.status === "Confirmed" &&
            booking.paymentStatus === "Paid"
    )
    .reduce(
        (sum, booking) =>
            sum + booking.totalPrice,
        0
    );


        // ==========================================
        // 8. RENDER DASHBOARD
        // ==========================================

        res.render("host/dashboard", {

            homes,

            bookings,

            totalProperties,

            totalBookings,

            totalRevenue,

            averageRating: averageRating.toFixed(1),

            pageTitle: "Host Dashboard",

            currentPage: "dashboard",

            isLoggedIn: req.isLoggedIn,

            user: req.session.user || {}

        });

    } catch (err) {

        console.log("Host Dashboard Error:", err);

        next(err);

    }
};

exports.getHostBookings = async (req, res, next) => {
    try {

        // Check login
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;

        // Find homes owned by this host
        const homes = await Home.find({
            owner: userId
        }).select("_id");

        const homeIds = homes.map(home => home._id);

        // Find bookings for those homes
        const bookings = await Booking.find({
            home: { $in: homeIds }
        })
        .populate("home")
        .populate("user")
        .sort({
            createdAt: -1
        });

        res.render("host/bookings", {

            bookings,

            pageTitle: "Manage Bookings",

            currentPage: "host-bookings",

            isLoggedIn: req.isLoggedIn,

            user: req.session.user || {}

        });

    } catch (err) {

        console.log("Host Bookings Error:", err);

        next(err);
    }
};

exports.getHostBookingDetails = async (req, res, next) => {
    try {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;

        const bookingId = req.params.bookingId;

        // Get booking
        const booking = await Booking.findById(bookingId)
            .populate("home")
            .populate("user");

        if (!booking) {
            return res.redirect("/host/bookings");
        }

        // Security check:
        // Make sure this booking belongs to one
        // of the host's properties.

        if (
            !booking.home ||
            booking.home.owner.toString() !== userId.toString()
        ) {
            return res.status(403).send("Unauthorized");
        }

        res.render("host/booking-detail", {

            booking,

            pageTitle: "Booking Details",

            currentPage: "host-bookings",

            isLoggedIn: req.isLoggedIn,

            user: req.session.user || {}

        });

    } catch (err) {

        console.log("Booking Details Error:", err);

        next(err);
    }
};

exports.postHostCancelBooking = async (req, res, next) => {
    try {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;

        const bookingId = req.params.bookingId;


        // Find booking and property
        const booking = await Booking.findById(bookingId)
            .populate("home");


        if (!booking) {
            return res.redirect("/host/bookings");
        }


        // Security check
        if (
            !booking.home ||
            booking.home.owner.toString() !== userId.toString()
        ) {
            return res.status(403).send("Unauthorized");
        }


        // Already cancelled
        if (booking.status === "Cancelled") {
            return res.redirect(
                `/host/bookings/${bookingId}`
            );
        }


        // Cancel booking
        booking.status = "Cancelled";

        await booking.save();

        req.flash(
            "success",
            "Booking cancelled successfully."
        );


        res.redirect(
            `/host/bookings/${bookingId}`
        );

    } catch (err) {

        console.log("Host Cancel Booking Error:", err);

        next(err);
    }
};

exports.postApproveBooking = async (req, res, next) => {
    try {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;
        const bookingId = req.params.bookingId;

        const booking = await Booking.findById(bookingId)
            .populate("home");

        if (!booking) {
            return res.redirect("/host/bookings");
        }

        // Security check
        if (
            !booking.home ||
            booking.home.owner.toString() !== userId.toString()
        ) {
            return res.status(403).send("Unauthorized");
        }

        // Only pending bookings can be approved
        if (booking.status !== "Pending") {
            return res.redirect(
                `/host/bookings/${bookingId}`
            );
        }

        booking.status = "Confirmed";

        await booking.save();

        req.flash(
            "success",
            "Booking approved successfully."
        );

        res.redirect(
            `/host/bookings/${bookingId}`
        );

    } catch (err) {

        console.log("Approve Booking Error:", err);

        next(err);
    }
};

