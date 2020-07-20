const db = require("../db");
const ExpressError = require("../helpers/expressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");

class Job {
  static async getAll({ search, min_salary, min_equity }) {
    let baseQuery = "SELECT title, company_handle FROM jobs";
    const whereExpressions = [];
    const queryValues = [];
    if (search && search.length > 0) {
      queryValues.push(`%${search}%`);
      whereExpressions.push(`title ILIKE $${queryValues.length}`);
    }
    if (min_salary && !isNaN(min_salary)) {
      queryValues.push(min_salary);
      whereExpressions.push(`salary >= $${queryValues.length}`);
    }
    if (min_equity && !isNaN(min_equity)) {
      queryValues.push(min_equity);
      whereExpressions.push(`equity >= $${queryValues.length}`);
    }
    if (whereExpressions.length > 0) {
      baseQuery += " WHERE ";
    }
    const finalQuery =
      baseQuery + whereExpressions.join(" AND ") + " ORDER BY date_posted DESC";
    const results = await db.query(finalQuery, queryValues);
    return results.rows;
  }
  static async create({ title, salary, equity, company_handle }) {
    const result = await db.query(
      `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle, date_posted`,
      [title, salary, equity, company_handle]
    );
    const job = result.rows[0];
    return job;
  }
  static async getAllByCompanyHandle(company_handle) {
    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle, date_posted
        FROM jobs
        WHERE company_handle = $1`,
      [company_handle]
    );
    return result.rows || [];
  }
  static async getOne(id) {
    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle, date_posted 
        FROM jobs
        WHERE id = $1`,
      [id]
    );
    const job = result.rows[0];
    if (!job) {
      throw new ExpressError(`No job found with id ${id}`, 404);
    }
    const companyResult = await db.query(
      `SELECT handle, name, num_employees, description, logo_url 
      FROM companies
      WHERE handle = $1`,
      [job.company_handle]
    );
    job.company = companyResult.rows[0];
    return job;
  }
  static async update(id, data) {
    let { query, values } = sqlForPartialUpdate("jobs", data, "id", id);
    const result = await db.query(query, values);
    const job = result.rows[0];
    if (!job) {
      throw new ExpressError(`No job found with id ${id}`, 404);
    }
    return job;
  }
  static async delete(id) {
    const result = await db.query(
      `DELETE FROM jobs 
        WHERE id = $1
        RETURNING id`,
      [id]
    );
    if (!result.rows[0]) {
      throw new ExpressError(`No job found with id ${id}`, 404);
    }
    return true;
  }
}

module.exports = Job;
