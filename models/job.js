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
  static async apply({ id, username, state = "applied" }) {
    const validStates = ["interested", "applied", "accepted", "rejected"];
    if (!validStates.includes(state)) {
      throw new ExpressError(
        `State must be one of: interested, applied, accepted, rejected`,
        400
      );
    }
    const existenceCheckUser = await db.query(
      `SELECT username FROM users WHERE username = $1`,
      [username]
    );
    if (!existenceCheckUser.rows[0]) {
      throw new ExpressError(`No user found with username ${username}`, 404);
    }
    const existenceCheckJob = await db.query(
      `SELECT id FROM jobs WHERE id = $1`,
      [id]
    );
    if (!existenceCheckJob.rows[0]) {
      throw new ExpressError(`No job found with id ${id}`, 404);
    }
    await db.query(
      `DELETE FROM applications
        WHERE username = $1 AND job_id = $2`,
      [username, id]
    );

    const result = await db.query(
      `INSERT INTO applications
          (username, job_id, state)
          VALUES
          ($1, $2, $3)
          RETURNING username, job_id, state, created_at`,
      [username, id, state]
    );

    return result.rows[0];
  }
}

module.exports = Job;
