const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

const authUser = (req, res, next) => {
  try {
    const token = req.body._token || req.query._token;
    if (token) {
      let payload = jwt.verify(token, SECRET_KEY);
      req.curr_username = payload.username;
      req.curr_admin = payload.is_admin;
    }
    return next();
  } catch (err) {
    err.status = 401;
    return next(err);
  }
};

const requireLogin = (req, res, next) => {
  try {
    if (req.curr_username) {
      return next();
    } else {
      return next({ status: 403, message: "User must be logged in" });
    }
  } catch (err) {
    return next(err);
  }
};
const requireCorrectUser = (req, res, next) => {
  try {
    if (req.curr_username && req.params.username === req.curr_username) {
      return next();
    } else {
      return next({ status: 403, message: "Unauthorized" });
    }
  } catch (err) {
    return next(err);
  }
};

const requireAdmin = (req, res, next) => {
  try {
    if (req.curr_admin) {
      return next();
    } else {
      return next({ status: 403, message: "Unauthorized" });
    }
  } catch (err) {
    return next(err);
  }
};

module.exports = { authUser, requireLogin, requireCorrectUser, requireAdmin };
