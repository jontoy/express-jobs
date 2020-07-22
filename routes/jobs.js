const express = require("express");
const jsonschema = require("jsonschema");
const newJobSchema = require("../schemas/newJobSchema.json");
const updateJobSchema = require("../schemas/updateJobSchema.json");
const router = new express.Router();
const Job = require("../models/job");
const ExpressError = require("../helpers/expressError");
const { requireLogin, requireAdmin, authUser } = require("../middleware/auth");
const User = require("../models/user");

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

/** GET /relevant
 *
 * Gets details on all jobs that have at least one technology in common
 * with current user.
 * Requires a logged in user.
 *
 * Returns:
 *  {jobs: [{ id,
 *          title,
 *          salary,
 *          equity,
 *          company_handle,
 *          date_posted,
 *          tech: [tech1, tech2, ...]},
 *          ...]
 *
 */
router.get("/relevant", requireLogin, async (req, res, next) => {
  try {
    const jobs = await User.getRelevantJobs({ username: req.curr_username });
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** POST /
 *
 * Creates a new job.
 * Requires a JWT with admin privileges.
 *
 * Accepts: {title, salary, equity, company_handle}
 *
 * Returns: {job: {id, title, salary, equity, company_handle, date_posted}}
 *
 */
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

/** GET /[id]
 *
 * Gets details on a job including its associated company.
 * Requires a logged in user.
 *
 * Returns:
 *  {job: { id,
 *          title,
 *          salary,
 *          equity,
 *          company_handle,
 *          date_posted,
 *          company: {handle, name, num_employees, description, logo_url}}}
 *
 * If id is not found, raises 404 error
 *
 */
router.get("/:id", requireLogin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await Job.getOne(id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[id]
 *
 * Updates a job.
 * Requires a JWT with admin privileges.
 *
 * Accepts: {title, salary, equity}
 *
 * Returns: {job: {id, title, salary, equity, company_handle, date_posted}}
 *
 * If job cannot be found, raises 404 error.
 */
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

/** DELETE /[id]
 *
 * Deletes a job.
 * Requires a JWT with admin privileges.
 *
 * Returns: {message: "Job deleted"}
 *
 * If job cannot be found, raises 404 error.
 */
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    await Job.delete(req.params.id);
    return res.json({ message: "Job deleted" });
  } catch (err) {
    return next(err);
  }
});

/** Apply /[id]/apply
 *
 * Alters the application state for a job for the current user.
 * If an application exists it will be updated. If not it will
 * be created.
 * Requires a logged in user.
 *
 * Accepts {state}
 * state must be one of: "Interested", "Applied", "Accepted", "Rejected"
 *
 * Returns: {message: state}
 *
 * If job and/or user cannot be found, raises 404 error.
 */
router.post("/:id/apply", requireLogin, async (req, res, next) => {
  try {
    const { state } = req.body;
    const application = await Job.apply({
      id: req.params.id,
      username: req.curr_username,
      state,
    });
    return res.json({ message: application.state });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
