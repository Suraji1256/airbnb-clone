const express = require('express');
const authRouter = express.Router();



//Local Module
const authController = require('../controller/authController');

authRouter.get("/login",authController.getLogin);

authRouter.post("/login",authController.postLogin);

authRouter.post("/logout",authController.postLogout);

authRouter.get("/signup",authController.getSignup);

authRouter.post("/signup",authController.postSignup);

authRouter.get("/profile", authController.getProfile);

authRouter.get(
  "/profile/edit",
  authController.getEditProfile
);

authRouter.post(
  "/profile/edit",
  authController.postEditProfile
);

authRouter.get(
  "/profile/change-password",
  authController.getChangePassword
);

authRouter.post(
  "/profile/change-password",
  authController.postChangePassword
);

module.exports = authRouter;