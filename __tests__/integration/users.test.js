process.env.DATABASE_URL = "jobly-test";

const app = require("../../app");
const request = require("supertest");
const db = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const createToken = require("../../helpers/createToken");

async function _pwd(password) {
  return await bcrypt.hash(password, 1);
}
let testUser;
let testJob;
let testApplication;
let tokens = {};
let badToken = jwt.sign({ username: "u1", is_admin: true }, "invalid-key");
beforeEach(async function () {
  let result = await db.query(
    `INSERT INTO users
        (username, password, first_name, last_name, email, photo_url, is_admin)
            VALUES
            ($1, $2, $3, $4, $5, $6, $7)
            RETURNING username, password, first_name, last_name, email, photo_url, is_admin`,
    ["u1", await _pwd("p1"), "fn1", "ln1", "e1", "www.logo1.com", false]
  );
  testUser = result.rows[0];
  tokens["u1"] = createToken("u1", false);
  result = await db.query(
    `INSERT INTO companies
        (handle, name, num_employees, description, logo_url)
        VALUES
        ($1, $2, $3, $4, $5)
        RETURNING handle`,
    ["handle1", "name1", 500, "desc1", "www.logo1.com"]
  );
  const { handle } = result.rows[0];
  result = await db.query(
    `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES
            ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle, date_posted`,
    ["t1", 40000, 0.03, handle]
  );
  testJob = result.rows[0];
  result = await db.query(
    `INSERT INTO applications
            (username, job_id, state)
            VALUES
            ($1, $2, $3)
            RETURNING username, job_id, state, created_at`,
    [testUser.username, testJob.id, "accepted"]
  );
  testApplication = result.rows[0];
});

afterEach(async function () {
  await db.query("DELETE FROM applications");
  await db.query("DELETE FROM users");
  await db.query("DELETE FROM jobs");
  await db.query("DELETE FROM companies");
});

describe("GET /users", function () {
  beforeEach(async function () {
    let sampleUsers = [
      ["u2", await _pwd("p2"), "fn2", "ln2", "e2", "www.logo2.com", false],
      ["u3", await _pwd("p3"), "fn3", "ln3", "e3", "www.logo3.com", true],
    ];
    for (let user of sampleUsers) {
      await db.query(
        `INSERT INTO users
        (username, password, first_name, last_name, email, photo_url, is_admin)
            VALUES
            ($1, $2, $3, $4, $5, $6, $7)
            RETURNING username, password, first_name, last_name, email, photo_url, is_admin`,
        user
      );
    }
  });
  it("should return list of all users when given no parameters", async function () {
    const response = await request(app).get("/users");
    expect(response.statusCode).toEqual(200);
    expect(response.body.users).toEqual([
      { username: "u1", first_name: "fn1", last_name: "ln1", email: "e1" },
      { username: "u2", first_name: "fn2", last_name: "ln2", email: "e2" },
      { username: "u3", first_name: "fn3", last_name: "ln3", email: "e3" },
    ]);
  });
  it("should appropriately filter by username", async function () {
    const response = await request(app).get("/users?username=u1");
    expect(response.statusCode).toEqual(200);
    expect(response.body.users).toEqual([
      { username: "u1", first_name: "fn1", last_name: "ln1", email: "e1" },
    ]);
  });
  it("should appropriately filter by first name", async function () {
    const response = await request(app).get("/users?first_name=fn2");
    expect(response.statusCode).toEqual(200);
    expect(response.body.users).toEqual([
      { username: "u2", first_name: "fn2", last_name: "ln2", email: "e2" },
    ]);
  });
  it("should appropriately filter by last name", async function () {
    const response = await request(app).get("/users?last_name=ln3");
    expect(response.statusCode).toEqual(200);
    expect(response.body.users).toEqual([
      { username: "u3", first_name: "fn3", last_name: "ln3", email: "e3" },
    ]);
  });
});

describe("GET /users/:username", function () {
  it("should return detailed information on a single user", async function () {
    const response = await request(app).get(`/users/${testUser.username}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body.user).toEqual({
      username: "u1",
      first_name: "fn1",
      last_name: "ln1",
      email: "e1",
      photo_url: "www.logo1.com",
      applications: [
        {
          state: testApplication.state,
          created_at: expect.any(String),
          job: { ...testJob, date_posted: expect.any(String) },
        },
      ],
    });
  });
  it("should return a 404 if given an invalid handle", async function () {
    const response = await request(app).get("/users/not-a-valid-username");
    expect(response.statusCode).toEqual(404);
  });
});

describe("POST /users", function () {
  it("should create a new user and return appropriate token", async function () {
    const newUser = {
      username: "u19",
      first_name: "fn19",
      last_name: "ln19",
      email: "e19",
      photo_url: "www.logo19.com",
    };

    let response = await request(app)
      .post(`/users`)
      .send({ ...newUser, password: await _pwd("p19") });
    expect(response.statusCode).toEqual(201);
    expect(response.body).toEqual({ token: expect.any(String) });
    expect(jwt.decode(response.body.token)).toEqual(
      expect.objectContaining({
        username: newUser.username,
        is_admin: false,
      })
    );

    response = await request(app).get(`/users/${newUser.username}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body.user).toEqual({
      username: "u19",
      first_name: "fn19",
      last_name: "ln19",
      email: "e19",
      photo_url: "www.logo19.com",
      applications: [],
    });
  });
  it("should return a 401 if username is not unique", async function () {
    const newUser = {
      username: "u1",
      password: await _pwd("p19"),
      first_name: "fn19",
      last_name: "ln19",
      email: "e19",
      photo_url: "www.logo19.com",
    };
    let response = await request(app).post(`/users`).send(newUser);
    expect(response.statusCode).toEqual(401);
  });
});

describe("POST /login", function () {
  it("should return a valid JWT if credentials are correct", async function () {
    const response = await request(app)
      .post("/login")
      .send({ username: "u1", password: "p1" });
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({ token: expect.any(String) });
    expect(jwt.decode(response.body.token)).toEqual(
      expect.objectContaining({
        username: "u1",
        is_admin: false,
      })
    );
  });
  it("should return a 401 error if username is invalid", async function () {
    const response = await request(app)
      .post("/login")
      .send({ username: "u0", password: "p1" });
    expect(response.statusCode).toEqual(401);
  });
  it("should return a 401 error if password is invalid", async function () {
    const response = await request(app)
      .post("/login")
      .send({ username: "u1", password: "p0" });
    expect(response.statusCode).toEqual(401);
  });
});

describe("PATCH /users/:username", function () {
  beforeEach(async function () {
    await db.query(
      `INSERT INTO users
            (username, password, first_name, last_name, email, photo_url, is_admin)
                VALUES
                ($1, $2, $3, $4, $5, $6, $7)`,
      ["u2", await _pwd("p2"), "fn2", "ln2", "e2", "www.logo2.com", false]
    );
  });
  it("should modify an existing user", async function () {
    const newUser = {
      first_name: "Tommy",
      last_name: "Two-Toes",
      email: "tommy@twotoes.com",
      photo_url: "www.newurl.com",
    };
    const targetResponse = { username: testUser.username, ...newUser };

    let response = await request(app)
      .patch(`/users/${testUser.username}`)
      .send({ ...newUser, _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.user).toEqual(targetResponse);
    response = await request(app).get(`/users/${testUser.username}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body.user).toEqual({
      ...targetResponse,
      applications: [
        {
          state: testApplication.state,
          created_at: expect.any(String),
          job: { ...testJob, date_posted: expect.any(String) },
        },
      ],
    });
  });
  it("should deny access if no token is present", async function () {
    const newUser = {
      first_name: "Tommy",
      last_name: "Two-Toes",
      email: "tommy@twotoes.com",
      photo_url: "www.newurl.com",
    };
    let response = await request(app)
      .patch(`/users/${testUser.username}`)
      .send({ newUser });
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token is present", async function () {
    const newUser = {
      first_name: "Tommy",
      last_name: "Two-Toes",
      email: "tommy@twotoes.com",
      photo_url: "www.newurl.com",
    };
    let response = await request(app)
      .patch(`/users/${testUser.username}`)
      .send({ ...newUser, _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should deny access if incorrect user", async function () {
    const newUser = {
      first_name: "Tommy",
      last_name: "Two-Toes",
      email: "tommy@twotoes.com",
      photo_url: "www.newurl.com",
    };
    let response = await request(app)
      .patch(`/users/u2`)
      .send({ ...newUser, _token: tokens.u1 });
    expect(response.statusCode).toEqual(403);
  });
  it("should return a 404 if username is invalid", async function () {
    const newUser = {
      first_name: "Tommy",
      last_name: "Two-Toes",
      email: "tommy@twotoes.com",
      photo_url: "www.newurl.com",
    };
    let response = await request(app)
      .patch(`/users/not-a-valid-username`)
      .send({ ...newUser, _token: createToken("not-a-valid-username", false) });
    expect(response.statusCode).toEqual(404);
  });
});

describe("DELETE /users/:username", function () {
  it("should delete an existing user", async function () {
    let response = await request(app)
      .delete(`/users/${testUser.username}`)
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
  });
  it("should deny access if no token is present", async function () {
    let response = await request(app).delete(`/users/${testUser.username}`);
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token is present", async function () {
    let response = await request(app)
      .delete(`/users/${testUser.username}`)
      .send({ _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should deny access if incorrect user", async function () {
    await db.query(
      `INSERT INTO users
              (username, password, first_name, last_name, email, photo_url, is_admin)
                  VALUES
                  ($1, $2, $3, $4, $5, $6, $7)`,
      ["u2", await _pwd("p2"), "fn2", "ln2", "e2", "www.logo2.com", false]
    );
    let response = await request(app)
      .delete(`/users/u2`)
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(403);
  });
  it("should return a 404 if username is invalid", async function () {
    let response = await request(app)
      .delete(`/users/not-a-valid-username`)
      .send({ _token: createToken("not-a-valid-username", false) });
    expect(response.statusCode).toEqual(404);
  });
});

afterAll(function () {
  db.end();
});
