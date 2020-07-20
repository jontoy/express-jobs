const express = require("express");
const jsonschema = require("jsonschema");
const newUserSchema = require("../schemas/newUserSchema.json");
const updateUserSchema = require("../schemas/updateUserSchema.json");
const router = new express.Router();
const User = require("../models/user");
const ExpressError = require("../helpers/expressError");
const { requireCorrectUser } = require("../middleware/auth");

/** GET /
 *
 * Get list of Users.
 *
 * It returns basic info:
 *    {users: [{username, first_name, last_name, email}, ...]}
 *
 */
router.get("/", async (req, res, next) => {
  try {
    const { username, first_name, last_name } = req.query;
    const users = await User.getAll({
      username,
      first_name,
      last_name,
    });
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  const schemaCheck = jsonschema.validate(req.body, newUserSchema);
  if (!schemaCheck.valid) {
    listOfErrors = schemaCheck.errors.map((error) => error.stack);
    return next(new ExpressError(listOfErrors, 400));
  }
  try {
    const token = await User.create(req.body);
    return res.status(201).json({ token });
  } catch (err) {
    return next(err);
  }
});

router.get("/:username", async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.getOne(username);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:username", requireCorrectUser, async (req, res, next) => {
  const schemaCheck = jsonschema.validate(req.body, updateUserSchema);
  if (!schemaCheck.valid) {
    listOfErrors = schemaCheck.errors.map((error) => error.stack);
    return next(new ExpressError(listOfErrors, 400));
  }
  try {
    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:username", requireCorrectUser, async (req, res, next) => {
  try {
    await User.delete(req.params.username);
    return res.json({ message: "User deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
