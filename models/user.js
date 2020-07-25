const db = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");
const ExpressError = require("../helpers/expressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");

/** The data access layer relating to user queries */
class User {
  /** Returns list of user info:
   *
   * [{username, first_name, last_name, email}, ...]
   *
   * Optionally allows filtering by username, first_name or last_name
   * Results are sorted by username
   * */
  static async getAll({ username, first_name, last_name }) {
    let baseQuery = "SELECT username, first_name, last_name, email FROM users";
    const whereExpressions = [];
    const queryValues = [];
    if (username && username.length > 0) {
      queryValues.push(`%${username}%`);
      whereExpressions.push(`username ILIKE $${queryValues.length}`);
    }
    if (first_name && first_name.length > 0) {
      queryValues.push(`%${first_name}%`);
      whereExpressions.push(`first_name ILIKE $${queryValues.length}`);
    }
    if (last_name && last_name.length > 0) {
      queryValues.push(`%${last_name}%`);
      whereExpressions.push(`last_name ILIKE $${queryValues.length}`);
    }
    if (whereExpressions.length > 0) {
      baseQuery += " WHERE ";
    }
    const finalQuery =
      baseQuery + whereExpressions.join(" AND ") + " ORDER BY username";
    const results = await db.query(finalQuery, queryValues);
    return results.rows;
  }

  /** Register user with data. Returns user details except password. */
  static async create({
    username,
    password,
    first_name,
    last_name,
    email,
    photo_url,
    is_admin = false,
  }) {
    const duplicateCheck = await db.query(
      `SELECT username FROM users WHERE username = $1`,
      [username]
    );
    if (duplicateCheck.rows[0]) {
      throw new ExpressError(`A username must be unique`, 401);
    }
    const hashedPassword = bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const result = await db.query(
      `INSERT INTO users
            (username, password, first_name, last_name, email, photo_url, is_admin)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING username, first_name, last_name, email, photo_url, is_admin`,
      [
        username,
        hashedPassword,
        first_name,
        last_name,
        email,
        photo_url,
        is_admin,
      ]
    );
    const user = result.rows[0];
    return user;
  }
  /** Checks if username and password are valid.
   *  If so, returns user details except password */
  static async authenticate({ username, password }) {
    const existenceCheck = await db.query(
      `SELECT username, password, first_name, last_name, email, photo_url, is_admin
            FROM users
            WHERE username = $1`,
      [username]
    );
    const user = existenceCheck.rows[0];
    if (user && (await bcrypt.compare(password, user.password))) {
      delete user.password;
      return user;
    }
    throw new ExpressError("Invalid login credentials", 401);
  }

  /** Returns detailed info for single user. Includes all associated
   * applications.
   *
   * {username, first_name, last_name, email, photo_url, applications:[app1, ...]}
   *
   * If user cannot be found, raises 404 error.
   *
   * */

  static async getOne(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, email, photo_url 
        FROM users
        WHERE username = $1`,
      [username]
    );
    const user = result.rows[0];
    if (!user) {
      throw new ExpressError(`No user found with username ${username}`, 404);
    }
    user.applications = await User.getApplications(username);
    return user;
  }
  /** Selectively updates user from given data
   *
   * Returns all data about user except is_admin and password.
   *
   * If user cannot be found, raises 404 error.
   *
   **/
  static async update(username, data) {
    if (data.password) {
      data.password = bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }
    let { query, values } = sqlForPartialUpdate(
      "users",
      data,
      "username",
      username
    );
    const result = await db.query(query, values);
    const user = result.rows[0];
    if (!user) {
      throw new ExpressError(`No user found with username ${username}`, 404);
    }
    delete user.is_admin;
    delete user.password;
    return user;
  }
  /** Deletes user. Returns true.
   *
   * If user cannot be found, should raises 404 error.
   *
   **/
  static async delete(username) {
    const result = await db.query(
      `DELETE FROM users 
        WHERE username = $1
        RETURNING username`,
      [username]
    );
    if (!result.rows[0]) {
      throw new ExpressError(`No user found with username ${username}`, 404);
    }
    return true;
  }

  /** Returns all applications associated with a username and their job data */
  static async getApplications(username) {
    const result = await db.query(
      `SELECT state, created_at, id, title, salary, equity, company_handle, date_posted 
            FROM applications LEFT JOIN jobs ON applications.job_id = jobs.id
            WHERE applications.username = $1`,
      [username]
    );
    return result.rows.map(
      ({
        state,
        created_at,
        id,
        title,
        salary,
        equity,
        company_handle,
        date_posted,
      }) => ({
        state,
        created_at,
        job: { id, title, salary, equity, company_handle, date_posted },
      })
    );
  }
  /**
   * Returns job data for all jobs that match user with the given
   * username on at least one technology.
   * Job data includes all technology associated with the job. */
  static async getRelevantJobs({ username }) {
    const result = await db.query(
      `SELECT j.id, j.title, j.salary, j.equity, j.company_handle, j.date_posted, json_agg(t.name) AS tech
        FROM jobs j 
        JOIN jobs_technologies jt ON j.id = jt.job_id
        JOIN technologies t ON t.id = jt.technology_id
        WHERE j.id IN (SELECT j.id
            FROM users u 
            JOIN users_technologies ut ON (u.username = ut.username)
            JOIN technologies t ON (t.id = ut.technology_id)
            JOIN jobs_technologies jt ON (t.id = jt.technology_id)
            JOIN jobs j ON (j.id = jt.job_id)
            WHERE u.username = $1)
        GROUP BY j.id`,
      [username]
    );
    return result.rows;
  }
}

module.exports = User;
