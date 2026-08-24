exports.pageNotFound = (req, res,  next)=>{
  res.status(404).render('404',{pageTitle : 'Page Not found', currentPage : '404', isLoggedIn : req.isLoggedIn, user: req.session.user || {}});
}

exports.get403 = (req, res) => {

    res.status(403).render("403", {
        pageTitle: "Access Denied",
        currentPage: "",
        isLoggedIn: req.session.isLoggedIn,
        user: req.session.user || {}
    });

};