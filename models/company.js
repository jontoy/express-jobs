const db = require("../db");
const ExpressError = require("../helpers/expressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");
const Job = require("./job");

class Company {
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
