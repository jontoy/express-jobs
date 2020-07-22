const express = require("express");
const jsonschema = require("jsonschema");
const newCompanySchema = require("../schemas/newCompanySchema.json");
const updateCompanySchema = require("../schemas/updateCompanySchema.json");
const router = new express.Router();
const Company = require("../models/company");
const ExpressError = require("../helpers/expressError");
const { requireLogin, requireAdmin } = require("../middleware/auth");

/** GET /
 *
 * Get list of companies.
 *
 * It returns basic info:
 *    {companies: [{handle, name}, ...]}
 *
 */
router.get("/", requireLogin, async (req, res, next) => {
  try {
    const { search, min_employees, max_employees } = req.query;
    const companies = await Company.getAll({
      search,
      min_employees,
      max_employees,
    });
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});
/** POST /
 *
 * Creates a new company. Requires JWT with admin privileges.
 *
 * Accepts {handle, name, num_employees, description, logo_url}
 *
 * Returns {company: {handle, name, num_employees, description, logo_url}}
 *
 * If handle and/or name is taken, raises 401 error
 *
 */
router.post("/", requireAdmin, async (req, res, next) => {
  const schemaCheck = jsonschema.validate(req.body, newCompanySchema);
  if (!schemaCheck.valid) {
    listOfErrors = schemaCheck.errors.map((error) => error.stack);
    return next(new ExpressError(listOfErrors, 400));
  }
  try {
    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]
 *
 * Gets details on a company including all jobs associated with its handle.
 * Requires a logged in user.
 *
 * Returns:
 *  {company: { handle,
 *              name,
 *              num_employees,
 *              description,
 *              logo_url,
 *              jobs:[
 *                  {id, title, salary, equity, company_handle, date_posted},
 *               ]
 *              }}
 *
 * If handle is not found, raises 404 error
 *
 */
router.get("/:handle", requireLogin, async (req, res, next) => {
  try {
    const { handle } = req.params;
    const company = await Company.getOne(handle);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle]
 *
 * Updates company. Requires a JWT with admin privileges.
 *
 * Accepts {handle, name, num_employees, description, logo_url}
 *
 * Returns {company: {handle, name, num_employees, description, logo_url}}
 *
 * If handle is not found, raises 404 error
 *
 */
router.patch("/:handle", requireAdmin, async (req, res, next) => {
  const schemaCheck = jsonschema.validate(req.body, updateCompanySchema);
  if (!schemaCheck.valid) {
    listOfErrors = schemaCheck.errors.map((error) => error.stack);
    return next(new ExpressError(listOfErrors, 400));
  }
  try {
    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]
 *
 * Deletes a company. Requires a JWT with admin privileges.
 *
 * Returns {message: "Company deleted"}}
 *
 * If handle is not found, raises 404 error
 *
 */
router.delete("/:handle", requireAdmin, async (req, res, next) => {
  try {
    await Company.delete(req.params.handle);
    return res.json({ message: "Company deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
