module.exports = (req, res, next) => {

    // User is not logged in
    if (!req.session.user) {
        return res.redirect("/login");
    }

    // User is not an admin
    if (req.session.user.userType !== "admin") {
        return res.status(403).send("Access Denied");
    }

    next();
};