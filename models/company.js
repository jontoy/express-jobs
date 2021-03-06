const db = require("../db");
const ExpressError = require("../helpers/expressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");
const Job = require("./job");

/** The data access layer relating to company queries */
class Company {
  /** Returns list of basic company info:
   *
   * [{handle, name}, ...]
   *
   * Optionally allows filtering by name, min_employees and max_employees
   * If min_employees > max_employees, a 400 error is raised.
   * Results are sorted by name
   * */
  static async getAll({ search, min_employees, max_employees }) {
    let baseQuery = "SELECT handle, name FROM companies";
    const whereExpressions = [];
    const queryValues = [];
    if (search && search.length > 0) {
      queryValues.push(`%${search}%`);
      whereExpressions.push(`name ILIKE $${queryValues.length}`);
    }
    if (min_employees && !isNaN(min_employees)) {
      queryValues.push(min_employees);
      whereExpressions.push(`num_employees >= $${queryValues.length}`);
    }
    if (max_employees && !isNaN(max_employees)) {
      if (min_employees && Number(min_employees) > Number(max_employees)) {
        throw new ExpressError(
          "min_employees must be less than max_employees",
          400
        );
      }
      queryValues.push(max_employees);
      whereExpressions.push(`num_employees <= $${queryValues.length}`);
    }
    if (whereExpressions.length > 0) {
      baseQuery += " WHERE ";
    }
    const finalQuery =
      baseQuery + whereExpressions.join(" AND ") + " ORDER BY name";
    const results = await db.query(finalQuery, queryValues);
    return results.rows;
  }
  /** Creates a company and returns full company info:
   * {handle, name, num_employees, description, logo_url}
   *
   * If handle and/or name are not unique, raises 401 error
   *
   **/
  static async create({ handle, name, num_employees, description, logo_url }) {
    const duplicateCheck = await db.query(
      `SELECT handle FROM companies WHERE handle = $1 OR name = $2`,
      [handle, name]
    );
    if (duplicateCheck.rows[0]) {
      throw new ExpressError(`A company's name and handle must be unique`, 401);
    }

    const result = await db.query(
      `INSERT INTO companies
            (handle, name, num_employees, description, logo_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING handle, name, num_employees, description, logo_url`,
      [handle, name, num_employees, description, logo_url]
    );
    return result.rows[0];
  }
  /** Returns company info: {handle, name, num_employees, description, logo_url, jobs:[job1,...]}
   *
   * If company cannot be found, raises a 404 error.
   *
   **/
  static async getOne(handle) {
    const result = await db.query(
      `SELECT handle, name, num_employees, description, logo_url 
        FROM companies
        WHERE handle = $1`,
      [handle]
    );
    const company = result.rows[0];
    if (!company) {
      throw new ExpressError(`No company found with handle ${handle}`, 404);
    }
    company.jobs = await Job.getAllByCompanyHandle(company.handle);
    return company;
  }

  /** Selectively updates company from given data
   *
   * Returns all data about company.
   *
   * If company cannot be found, raises a 404 error.
   *
   **/
  static async update(handle, data) {
    let { query, values } = sqlForPartialUpdate(
      "companies",
      data,
      "handle",
      handle
    );
    const result = await db.query(query, values);
    const company = result.rows[0];
    if (!company) {
      throw new ExpressError(`No company found with handle ${handle}`, 404);
    }
    return company;
  }
  /** Deletes company. Returns true.
   *
   * If company cannot be found, raises a 404 error.
   *
   **/
  static async delete(handle) {
    const result = await db.query(
      `DELETE FROM companies 
        WHERE handle = $1
        RETURNING handle`,
      [handle]
    );
    if (!result.rows[0]) {
      throw new ExpressError(`No company found with handle ${handle}`, 404);
    }
    return true;
  }
}

module.exports = Company;
