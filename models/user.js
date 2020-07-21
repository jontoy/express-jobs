const db = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");
const ExpressError = require("../helpers/expressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");
const createToken = require("../helpers/createToken");

class User {
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
            RETURNING username, is_admin`,
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
    return createToken(user.username, user.is_admin);
  }
  static async authenticate({ username, password }) {
    const existenceCheck = await db.query(
      `SELECT username, password, is_admin
            FROM users
            WHERE username = $1`,
      [username]
    );
    const user = existenceCheck.rows[0];
    if (user && (await bcrypt.compare(password, user.password))) {
      return createToken(user.username, user.is_admin);
    }
    throw new ExpressError("Invalid login credentials", 401);
  }
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
