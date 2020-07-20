const express = require("express");
const jsonschema = require("jsonschema");
const newJobSchema = require("../schemas/newJobSchema.json");
const updateJobSchema = require("../schemas/updateJobSchema.json");
const router = new express.Router();
const Job = require("../models/job");
const ExpressError = require("../helpers/expressError");
const { requireLogin, requireAdmin, authUser } = require("../middleware/auth");

/** GET /
 *
 * Get list of jobs.
 *
 * It returns basic info:
 *    {jobs: [{title, company_handle}, ...]}
 *
 */
router.get("/", requireLogin, async (req, res, next) => {
  try {
    const { search, min_salary, min_equity } = req.query;
    const jobs = await Job.getAll({
      search,
      min_salary,
      min_equity,
    });
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

router.post("/", requireAdmin, async (req, res, next) => {
  const schemaCheck = jsonschema.validate(req.body, newJobSchema);
  if (!schemaCheck.valid) {
    listOfErrors = schemaCheck.errors.map((error) => error.stack);
    return next(new ExpressError(listOfErrors, 400));
  }
  try {
    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", requireLogin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await Job.getOne(id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", requireAdmin, async (req, res, next) => {
  const schemaCheck = jsonschema.validate(req.body, updateJobSchema);
  if (!schemaCheck.valid) {
    listOfErrors = schemaCheck.errors.map((error) => error.stack);
    return next(new ExpressError(listOfErrors, 400));
  }
  try {
    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    await Job.delete(req.params.id);
    return res.json({ message: "Job deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
