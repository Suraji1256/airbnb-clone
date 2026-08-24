module.exports = (req, res, next) => {

    // User must be logged in
    if (!req.session.isLoggedIn) {
        return res.redirect("/login");
    }

    // User must be a host
    if (req.session.user.userType !== "host") {
        return res.status(403).render("403", {
            pageTitle: "Access Denied",
            currentPage: "",
            isLoggedIn: req.session.isLoggedIn,
            user: req.session.user
        });
    }

    next();
};