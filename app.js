//.env import
require("dotenv").config();

//core module
const path = require('path');

//External Module
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const { default: mongoose } = require('mongoose');
const multer = require('multer');
const DB_PATH = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;
const flash = require("connect-flash");
const reviewRouter =
require("./routes/reviewRouter");
const paymentRouter =
    require("./routes/paymentRouter");

//Local Module User Router
const storeRouter = require('./routes/storeRouter');
//Local Module Host Router
const hostRouter = require('./routes/hostRouter');

const authRouter = require('./routes/authRouter');

const rootDir = require("./utils/pageUtil");

const errorController = require('./controller/errors');

const bookingRouter = require("./routes/bookingRouter");
const adminRouter = require("./routes/adminRouter");



const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const store = new MongoDBStore({
  uri: DB_PATH,
  collection: 'sessions'
});

const randomString = (length) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = randomString(10);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  }
  else {
    cb(new Error('Invalid file type. Only JPEG, PNG, JPG, and WEBP are allowed.'));
  }
}


app.use(express.static("public"));

const multiOptions = { 
  storage: storage,
  fileFilter: fileFilter
}
app.use(express.json());
app.use(express.urlencoded());
app.use(multer(multiOptions).single('photo'));
app.use(express.static(path.join(rootDir, 'public')));

app.use('/uploads', express.static(path.join(rootDir, 'uploads')));
app.use('/host/uploads', express.static(path.join(rootDir, 'uploads')));
app.use('/homes/uploads', express.static(path.join(rootDir, 'uploads')));

app.use(session({
  secret: SESSION_SECRET, // Replace
  resave: false,
  saveUninitialized: true,
  store: store,
  cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24
    }
}));


app.use((req, res, next) => {

    res.locals.isLoggedIn = req.session.isLoggedIn || false;

    res.locals.user = req.session.user || {};

    res.locals.isHost =
        req.session.isLoggedIn &&
        req.session.user &&
        req.session.user.userType === "host";

    next();
});


app.use(flash());

app.use((req, res, next) => {

    res.locals.successMessage = req.flash("success");
    res.locals.errorMessage = req.flash("error");

    next();

});

app.use((req, res, next) => {
    req.isLoggedIn = req.session.isLoggedIn
    next();
  });


app.use(authRouter);
app.use(storeRouter);
app.use(bookingRouter);
app.use("/payment", paymentRouter);
app.use(reviewRouter);
const isHost = require("./middleware/isHost");

app.use("/host", isHost, hostRouter);

app.use("/admin", adminRouter);


app.use(errorController.pageNotFound)


const PORT = process.env.PORT || 3004;


mongoose.connect(DB_PATH).then(()=>{
  console.log("Connected To Mongoose");
  
  app.listen(PORT, () => {
  console.log(`Server running on address http://localhost:${PORT}`);
});

}).catch(err =>{
  console.log("Error While Connecting Mongoose", err);
  
})
