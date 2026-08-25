const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/booking");
const Review = require("../models/review");
const {
    buildHomeFilter,
    buildHomeSort
} = require("../utils/homeFilter");


exports.getIndex = (req, res, next)=>{
    
    Home.find().then(registeredHomes => {
        res.render('store/index', {
            registeredHomes:registeredHomes, pageTitle : 'airbnb Home',
             currentPage : 'index',
             isLoggedIn : req.isLoggedIn,
            user: req.session.user || {}
            }
        )
    })
}

exports.getHomes = async (req, res, next) => {

    try {

        // ==============================
        // 1. FILTER
        // ==============================

        const filter = buildHomeFilter(req.query);


        // ==============================
        // 2. SORT
        // ==============================

        const sortOption = buildHomeSort(req.query.sort);


        // ==============================
        // 3. PAGINATION
        // ==============================

        const page = Math.max(
            Number.parseInt(req.query.page, 10) || 1,
            1
        );

        const limit = 8;

        const skip = (page - 1) * limit;


        // ==============================
        // 4. TOTAL HOMES
        // ==============================

        const totalHomes = await Home.countDocuments(filter);

        const totalPages = Math.ceil(totalHomes / limit);


        // ==============================
        // 5. GET HOMES
        // ==============================

        const registeredHomes = await Home
            .find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);


        // ==============================
        // 6. AMENITIES
        // ==============================

        const amenities = req.query.amenities
            ? (
                Array.isArray(req.query.amenities)
                    ? req.query.amenities
                    : [req.query.amenities]
            )
            : [];

            const queryParams = {
                ...req.query
            };

            delete queryParams.page;


        // ==============================
        // 7. RENDER PAGE
        // ==============================

        res.render("store/home-list", {

            registeredHomes,

            pageTitle: "Homes List",

            currentPage: "Home",

            isLoggedIn: req.isLoggedIn,

            user: req.session.user || {},

            location: req.query.location || "",

            keyword: req.query.keyword || "",

            minPrice: req.query.minPrice || "",

            maxPrice: req.query.maxPrice || "",

            propertyType: req.query.propertyType || "",

            amenities,

            sort: req.query.sort || "",

            currentPageNumber: page,

            totalPages,

            queryParams

        });

            } catch (err) {

            console.log("Error while loading homes:", err);

            next(err);

            }

        };

exports.getBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({
            user: req.session.user.id
        })
        .populate("home")
        .sort({ createdAt: -1 });

        res.render("store/bookings", {
            bookings,
            pageTitle: "My Bookings",
            currentPage: "bookings",
            isLoggedIn: req.isLoggedIn,
            user: req.session.user || {}
        });

    } catch (err) {
        console.log(err);
        next(err);
    }
};

exports.getFavouriteList = async (req, res, next) => {
    try {
        // Check login
        if (!req.session.user) {
            return res.redirect("/login");
        }

        // Your session stores "id", not "_id"
        const userId = req.session.user.id;

        console.log("Session User ID:", userId);

        const user = await User.findById(userId).populate("favourites");

        // User not found
        if (!user) {
            console.log("User not found in database:", userId);
            return res.redirect("/login");
        }

        res.render("store/favourite-list", {
            favouriteHomes: user.favourites || [],
            pageTitle: "My Favourite",
            currentPage: "favourites",
            isLoggedIn: req.isLoggedIn,
            user: req.session.user
        });

    } catch (err) {
        console.log("Error loading favourites:", err);
        next(err);
    }
};
    

exports.postAddToFavourite = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const homeId = req.body.id;
        const userId = req.session.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.redirect("/login");
        }

        // Make sure favourites exists
        if (!user.favourites) {
            user.favourites = [];
        }

        // Convert IDs to strings before comparing
        const alreadyFavourite = user.favourites.some(
            id => id.toString() === homeId.toString()
        );

        if (!alreadyFavourite) {
            user.favourites.push(homeId);
            await user.save();
        }

        res.redirect("/favourites");

    } catch (err) {
        console.log("Error adding favourite:", err);
        next(err);
    }
};

exports.postRemoveFromFavourite = async (req, res, next) => {
        const homeId = req.params.homeId;
        const userId = req.session.user.id;
        const user = await User.findById(userId);
        if(user.favourites.includes(homeId)){
            user.favourites = user.favourites.filter(fav => fav != homeId);
            await user.save();
        }

        res.redirect("/favourites");
};

exports.getHomeDetails = async (req, res, next) => {
    try {

        const homeId = req.params.homeId;

        const home = await Home.findById(homeId)
    .populate("owner", "firstName lastName");

        if (!home) {
            return res.redirect("/homes");
        }

        const reviews = await Review.find({
            home: homeId
        })
        .populate("user", "firstName lastName")
        .sort({ createdAt: -1 });

        res.render("store/home-detail", {
            home,
            reviews,
            pageTitle: "Home Detail",
            currentPage: "Home",
            isLoggedIn: req.isLoggedIn,
            user: req.session.user || {}
        });

    } catch (err) {
        next(err);
    }
};