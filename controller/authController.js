const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

// ======================
// GET LOGIN
// ======================

exports.getLogin = (req, res) => {
    res.render("auth/login", {
        pageTitle: "Login",
        currentPage: "login",
        isLoggedIn: false,
        errors: [],
        oldInput: {
            email: ""
        },
        user: {}
    });
};


// ======================
// GET SIGNUP
// ======================

exports.getSignup = (req, res) => {
    res.render("auth/signup", {
        pageTitle: "Sign Up",
        currentPage: "signup",
        isLoggedIn: false,
        errors: [],
        oldInput: {
            firstName: "",
            lastName: "",
            email: "",
            userType: ""
        },
        user: {}
    });
};


// ======================
// POST SIGNUP
// ======================

exports.postSignup = [

    // First Name
    check("firstName")
        .trim()
        .notEmpty()
        .withMessage("First Name is required")
        .isLength({ min: 2 })
        .withMessage("First Name must be at least 2 characters")
        .matches(/^[A-Za-z]+$/)
        .withMessage("First Name must contain only letters"),

    // Last Name
    check("lastName")
        .trim()
        .notEmpty()
        .withMessage("Last Name is required")
        .matches(/^[A-Za-z]+$/)
        .withMessage("Last Name must contain only letters"),

    // Email
    check("email")
        .trim()
        .isEmail()
        .withMessage("Please enter a valid email")
        .normalizeEmail(),

    // Password
    check("password")
        .trim()
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
        .matches(/[a-z]/)
        .withMessage("Must contain one lowercase letter")
        .matches(/[A-Z]/)
        .withMessage("Must contain one uppercase letter")
        .matches(/[0-9]/)
        .withMessage("Must contain one number")
        .matches(/[!@#$%^&*]/)
        .withMessage("Must contain one special character"),

    // Confirm Password
    check("confirmPassword")
        .trim()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match");
            }
            return true;
        }),

    // User Type
    check("userType")
        .notEmpty()
        .withMessage("Please select Guest or Host")
        .isIn(["guest", "host"])
        .withMessage("Invalid user type"),

    // Terms
    check("terms")
        .equals("accepted")
        .withMessage("Please accept Terms & Conditions"),


    // Controller
    async (req, res, next) => {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(422).render("auth/signup", {

                    pageTitle: "Sign Up",
                    currentPage: "signup",
                    isLoggedIn: false,

                    errors: errors.array().map(err => err.msg),

                    oldInput: {
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        email: req.body.email,
                        userType: req.body.userType
                    },

                    user: {}

                });

            }


            // Check existing email

            const existingUser = await User.findOne({

                email: req.body.email

            });

            if (existingUser) {

                return res.status(422).render("auth/signup", {

                    pageTitle: "Sign Up",
                    currentPage: "signup",
                    isLoggedIn: false,

                    errors: ["Email already exists."],

                    oldInput: {
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        email: req.body.email,
                        userType: req.body.userType
                    },

                    user: {}

                });

            }


            // Hash Password

            const hashedPassword = await bcrypt.hash(

                req.body.password,

                12

            );


            // Save User

            const user = new User({

                firstName: req.body.firstName,

                lastName: req.body.lastName,

                email: req.body.email,

                password: hashedPassword,

                userType: req.body.userType

            });

            await user.save();


            req.flash(

                "success",

                "Account created successfully. Please login."

            );

            res.redirect("/login");


        }

        catch (err) {

            next(err);

        }

    }

];


// ======================
// POST LOGIN
// ======================

exports.postLogin = async (req, res, next) => {

    try {

        const { email, password } = req.body;

        const user = await User.findOne({

            email

        });

        if (!user) {

            req.flash(

                "error",

                "User not found. Please sign up first."

            );

            return res.redirect("/login");

        }

        const isMatch = await bcrypt.compare(

            password,

            user.password

        );

        if (!isMatch) {

            req.flash(

                "error",

                "Incorrect password."

            );

            return res.redirect("/login");

        }

        req.session.isLoggedIn = true;

        req.session.user = {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userType: user.userType,
    profilePhoto: user.profilePhoto || ""
};

        await req.session.save();

        req.flash(

            "success",

            `Welcome back, ${user.firstName}!`

        );

        res.redirect("/");

    }

    catch (err) {

        next(err);

    }

};


// ======================
// LOGOUT
// ======================

exports.postLogout = (req, res, next) => {

    req.session.destroy(err => {

        if (err) {

            return next(err);

        }

        res.redirect("/login");

    });

};



const Home = require("../models/home");

exports.getProfile = async (req, res, next) => {
    try {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;

        const myListings = await Home.find({
            owner: userId
        }).sort({ createdAt: -1 });

        res.render("user/profile", {
            user: req.session.user,
            myListings,
            pageTitle: "My Profile",
            currentPage: "profile"
        });

    } catch (error) {
        next(error);
    }
};
exports.getEditProfile = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.render("user/edit-profile", {
    pageTitle: "Edit Profile",
    currentPage: "profile",
    user: req.session.user,
  });
};


exports.postEditProfile = async (req, res, next) => {
  try {
    // 1. Check login
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const { name, email } = req.body;

    // 2. Basic validation
    if (!name || !email) {
      return res.status(400).send("Name and email are required");
    }

    // 3. Clean input
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 4. Validate name
    if (cleanName.length < 2) {
      return res.status(400).send(
        "Name must be at least 2 characters"
      );
    }

    // 5. Split full name
    const nameParts = cleanName.split(/\s+/);

    const cleanFirstName = nameParts[0];
    const cleanLastName = nameParts.slice(1).join(" ");

    // 6. Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).send(
        "Please enter a valid email address"
      );
    }

    const userId = req.session.user.id;

    // 7. Check whether email is already used
    const existingUser = await User.findOne({
      email: cleanEmail,
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(400).send(
        "Email is already registered"
      );
    }

    // 8. Prepare update data
    const updateData = {
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: cleanEmail
    };

    // 9. Add profile photo if uploaded
    if (req.file) {
      updateData.profilePhoto = req.file.path;
    }

    // 10. Update MongoDB
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).send("User not found");
    }

    // 11. Update session
    req.session.user.firstName = user.firstName;
    req.session.user.lastName = user.lastName;
    req.session.user.email = user.email;
    req.session.user.profilePhoto = user.profilePhoto || "";

    // 12. Save session
    req.session.save(err => {
      if (err) {
        console.log("Session save error:", err);
        return next(err);
      }

      res.redirect("/profile");
    });

  } catch (err) {
    console.log("Edit profile error:", err);

    // Duplicate email
    if (err.code === 11000) {
      return res.status(400).send(
        "Email is already registered"
      );
    }

    next(err);
  }
};

exports.getChangePassword = (req, res, next) => {
  res.render("user/change-password", {
    pageTitle: "Change Password",
    currentPage: "profile",
    user: req.session.user,
  });
};

exports.postChangePassword = async (req, res, next) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword
    } = req.body;

    // 1. Check all fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).send("All fields are required");
    }

    // 2. Check new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).send("New passwords do not match");
    }

    // 3. Check password length
    if (newPassword.length < 8) {
      return res.status(400).send(
        "New password must be at least 8 characters"
      );
    }

    // 4. Check logged-in user
    if (!req.session.user) {
      return res.redirect("/login");
    }

    // 5. Get user ID
    const userId = req.session.user.id;

    // 6. Get user from database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // 7. Compare current password
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).send("Current password is incorrect");
    }

    // 8. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 9. Update password
    user.password = hashedPassword;
    await user.save();

    // 10. Redirect to profile
    res.redirect("/profile");

  } catch (error) {
    console.log("Change password error:", error);
    next(error);
  }
};