// ========================================
// ENVIRONMENT VARIABLES
// ========================================
require("dotenv").config();


// ========================================
// CORE MODULE
// ========================================
const path = require("path");


// ========================================
// EXTERNAL MODULES
// ========================================
const express = require("express");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const mongoose = require("mongoose");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./utils/cloudinary");
const flash = require("connect-flash");


// ========================================
// ROUTERS
// ========================================
const storeRouter = require("./routes/storeRouter");
const hostRouter = require("./routes/hostRouter");
const authRouter = require("./routes/authRouter");
const bookingRouter = require("./routes/bookingRouter");
const reviewRouter = require("./routes/reviewRouter");
const paymentRouter = require("./routes/paymentRouter");
const adminRouter = require("./routes/adminRouter");


// ========================================
// MIDDLEWARE
// ========================================
const isHost = require("./middleware/isHost");


// ========================================
// UTILS / CONTROLLERS
// ========================================
const rootDir = require("./utils/pageUtil");
const errorController = require("./controller/errors");


// ========================================
// ENV VARIABLES
// ========================================
const DB_PATH = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;


// ========================================
// APP
// ========================================
const app = express();


// ========================================
// VIEW ENGINE
// ========================================
app.set("view engine", "ejs");
app.set("views", "views");


// ========================================
// CHECK REQUIRED ENV VARIABLES
// ========================================
if (!DB_PATH) {
    console.error("❌ MONGO_URI is missing");
    process.exit(1);
}

if (!SESSION_SECRET) {
    console.error("❌ SESSION_SECRET is missing");
    process.exit(1);
}

if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("❌ CLOUDINARY_CLOUD_NAME is missing");
    process.exit(1);
}

if (!process.env.CLOUDINARY_API_KEY) {
    console.error("❌ CLOUDINARY_API_KEY is missing");
    process.exit(1);
}

if (!process.env.CLOUDINARY_API_SECRET) {
    console.error("❌ CLOUDINARY_API_SECRET is missing");
    process.exit(1);
}


// ========================================
// CLOUDINARY MULTER STORAGE
// ========================================
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,

    params: {
        folder: "airbnb-clone",

        allowed_formats: [
            "jpg",
            "jpeg",
            "png",
            "webp"
        ]
    }
});


// ========================================
// IMAGE FILE FILTER
// ========================================
const fileFilter = (req, file, cb) => {

    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Invalid file type. Only JPEG, PNG, JPG, and WEBP are allowed."
            )
        );

    }
};


// ========================================
// TRUST RENDER PROXY
// ========================================
app.set("trust proxy", 1);


// ========================================
// BODY PARSERS
// ========================================
app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ========================================
// STATIC PUBLIC FILES
// ========================================
app.use(
    express.static(
        path.join(rootDir, "public")
    )
);


// ========================================
// MULTER
// ========================================
app.use(
    multer({
        storage: storage,
        fileFilter: fileFilter,

        limits: {
            fileSize: 5 * 1024 * 1024
        }

    }).single("photo")
);


// ========================================
// MONGODB SESSION STORE
// ========================================
const store = new MongoDBStore({

    uri: DB_PATH,

    collection: "sessions"

});


// ========================================
// SESSION
// ========================================
app.use(
    session({

        secret: SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        store: store,

        cookie: {

            httpOnly: true,

            secure: process.env.NODE_ENV === "production",

            sameSite: "lax",

            maxAge: 1000 * 60 * 60 * 24

        }

    })
);


// ========================================
// GLOBAL SESSION VARIABLES
// ========================================
app.use((req, res, next) => {

    res.locals.isLoggedIn =
        req.session.isLoggedIn || false;

    res.locals.user =
        req.session.user || {};

    res.locals.isHost =
        req.session.isLoggedIn &&
        req.session.user &&
        req.session.user.userType === "host";

    next();

});


// ========================================
// FLASH MESSAGES
// ========================================
app.use(flash());


app.use((req, res, next) => {

    res.locals.successMessage =
        req.flash("success");

    res.locals.errorMessage =
        req.flash("error");

    next();

});


// ========================================
// REQUEST LOGIN STATUS
// ========================================
app.use((req, res, next) => {

    req.isLoggedIn =
        req.session.isLoggedIn || false;

    next();

});


// ========================================
// ROUTES
// ========================================

// Authentication
app.use(authRouter);


// Store
app.use(storeRouter);


// Bookings
app.use(bookingRouter);


// Payment
app.use("/payment", paymentRouter);


// Reviews
app.use(reviewRouter);


// Host
app.use(
    "/host",
    isHost,
    hostRouter
);


// Admin
app.use(
    "/admin",
    adminRouter
);


// ========================================
// 404
// ========================================
app.use(
    errorController.pageNotFound
);


// ========================================
// PORT
// ========================================
const PORT =
    process.env.PORT || 3004;


// ========================================
// DATABASE CONNECTION
// ========================================
mongoose
    .connect(DB_PATH)

    .then(() => {

        console.log("✅ Connected To Mongoose");

        app.listen(PORT, "0.0.0.0", () => {

            console.log(
                `🚀 Server running on port ${PORT}`
            );

        });

    })

    .catch((err) => {

        console.error(
            "❌ Error While Connecting Mongoose:",
            err
        );

        process.exit(1);

    });