const express = require("express");
const jsonschema = require("jsonschema");
const loginSchema = require("../schemas/loginSchema.json");
const router = new express.Router();
const User = require("../models/user");
const ExpressError = require("../helpers/expressError");
const createToken = require("../helpers/createToken");

/** POST /login
 *
 * Logs in user. Returns a JWT.
 *
 * Accepts {username, password}
 *
 * It returns: {token}
 *
 * If incorrect username and/or password, raises 401 error
 */
router.post("/login", async (req, res, next) => {
  const schemaCheck = jsonschema.validate(req.body, loginSchema);
  if (!schemaCheck.valid) {
    listOfErrors = schemaCheck.errors.map((error) => error.stack);
    return next(new ExpressError(listOfErrors, 400));
  }
  try {
    const user = await User.authenticate(req.body);
    const token = createToken(user.username, user.is_admin);
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
