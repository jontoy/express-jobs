const express = require("express");
const jsonschema = require("jsonschema");
const loginSchema = require("../schemas/loginSchema.json");
const router = new express.Router();
const User = require("../models/user");
const ExpressError = require("../helpers/expressError");

router.post("/login", async (req, res, next) => {
  const schemaCheck = jsonschema.validate(req.body, loginSchema);
  if (!schemaCheck.valid) {
    listOfErrors = schemaCheck.errors.map((error) => error.stack);
    return next(new ExpressError(listOfErrors, 400));
  }
  try {
    const token = await User.authenticate(req.body);
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
