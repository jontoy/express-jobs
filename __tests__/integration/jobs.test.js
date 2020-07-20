process.env.DATABASE_URL = "jobly-test-jobs";

const app = require("../../app");
const request = require("supertest");
const db = require("../../db");
const bcrypt = require("bcrypt");
const createToken = require("../../helpers/createToken");
const jwt = require("jsonwebtoken");

let testCompany;
let testJob;
let tokens = {};
let badToken = jwt.sign({ username: "u1", is_admin: true }, "invalid-key");
beforeEach(async function () {
  async function _pwd(password) {
    return await bcrypt.hash(password, 1);
  }
  let result = await db.query(
    `INSERT INTO companies
                (handle, name, num_employees, description, logo_url)
                VALUES
                ($1, $2, $3, $4, $5)
                RETURNING handle, name, num_employees, description, logo_url`,
    ["handle1", "name1", 500, "desc1", "www.logo1.com"]
  );
  testCompany = result.rows[0];
  result = await db.query(
    `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES
            ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle, date_posted`,
    ["t1", 40000, 0.03, testCompany.handle]
  );
  testJob = result.rows[0];

  let sampleUsers = [
    ["u1", await _pwd("p1"), "fn1", "ln1", "e1", "www.logo1.com", false],
    ["u2", await _pwd("p2"), "fn2", "ln2", "e2", "www.logo2.com", true],
  ];

  for (let user of sampleUsers) {
    await db.query(
      `INSERT INTO users
        (username, password, first_name, last_name, email, photo_url, is_admin)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      user
    );
    tokens[user[0]] = createToken(user[0], user[6]);
  }
});

afterEach(async function () {
  await db.query("DELETE FROM jobs");
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM users");
});

describe("GET /companies", function () {
  beforeEach(async function () {
    let sampleJobs = [
      ["t2", 50000, 0.05, testCompany.handle],
      ["t3", 60000, 0.01, testCompany.handle],
    ];
    for (let job of sampleJobs) {
      const result = await db.query(
        `INSERT INTO jobs
                    (title, salary, equity, company_handle)
                    VALUES
                    ($1, $2, $3, $4)`,
        job
      );
    }
  });
  it("should return list of all jobs when given no parameters", async function () {
    console.log(tokens.u1);
    const response = await request(app)
      .get("/jobs")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    console.log(response.body);
    expect(response.body.jobs).toEqual([
      { title: "t3", company_handle: testCompany.handle },
      { title: "t2", company_handle: testCompany.handle },
      { title: "t1", company_handle: testCompany.handle },
    ]);
  });
  it("should deny access if no token present", async function () {
    const response = await request(app).get("/jobs");
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token is present", async function () {
    const response = await request(app).get("/jobs").send({ _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should filter by title when passed a search parameter", async function () {
    const response = await request(app)
      .get("/jobs?search=t1")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.jobs).toEqual([
      { title: "t1", company_handle: testCompany.handle },
    ]);
  });
  it("should appropriately filter by min_salary", async function () {
    const response = await request(app)
      .get("/jobs?min_salary=45000")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.jobs).toEqual([
      { title: "t3", company_handle: testCompany.handle },
      { title: "t2", company_handle: testCompany.handle },
    ]);
  });
  it("should appropriately filter by min_equity", async function () {
    const response = await request(app)
      .get("/jobs?min_equity=0.015")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.jobs).toEqual([
      { title: "t2", company_handle: testCompany.handle },
      { title: "t1", company_handle: testCompany.handle },
    ]);
  });
  it("should appropriately filter by min salary & equity", async function () {
    const response = await request(app)
      .get("/jobs?min_salary=45000&min_equity=0.015")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.jobs).toEqual([
      { title: "t2", company_handle: testCompany.handle },
    ]);
  });
});

describe("GET /jobs/:id", function () {
  it("should return detailed information on a single job", async function () {
    const response = await request(app)
      .get(`/jobs/${testJob.id}`)
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.job).toEqual({
      ...testJob,
      date_posted: expect.any(String),
      company: testCompany,
    });
  });
  it("should deny access if no token is present", async function () {
    const response = await request(app).get(`/jobs/${testJob.id}`);
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token is present", async function () {
    const response = await request(app)
      .get(`/jobs/${testJob.id}`)
      .send({ _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should return a 404 if given an invalid id", async function () {
    const response = await request(app)
      .get("/jobs/0")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(404);
  });
});

describe("POST /jobs", function () {
  it("should create a new job", async function () {
    const newJob = {
      title: "nj",
      salary: 10000,
      equity: 0.2,
      company_handle: testCompany.handle,
    };
    let response = await request(app)
      .post(`/jobs`)
      .send({ ...newJob, _token: tokens.u2 });
    expect(response.statusCode).toEqual(201);
    expect(response.body.job).toEqual({
      ...newJob,
      id: expect.any(Number),
      date_posted: expect.any(String),
    });
    const id = response.body.job.id;
    response = await request(app)
      .get(`/jobs/${id}`)
      .send({ _token: tokens.u2 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.job).toEqual({
      ...newJob,
      id: expect.any(Number),
      date_posted: expect.any(String),
      company: testCompany,
    });
  });
  it("should deny access if no token is present", async function () {
    const newJob = {
      title: "nj",
      salary: 10000,
      equity: 0.2,
      company_handle: testCompany.handle,
    };
    let response = await request(app).post(`/jobs`).send(newJob);
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token is present", async function () {
    const newJob = {
      title: "nj",
      salary: 10000,
      equity: 0.2,
      company_handle: testCompany.handle,
    };
    let response = await request(app)
      .post(`/jobs`)
      .send({ ...newJob, _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should deny access if user is not admin", async function () {
    const newJob = {
      title: "nj",
      salary: 10000,
      equity: 0.2,
      company_handle: testCompany.handle,
    };
    let response = await request(app)
      .post(`/jobs`)
      .send({ ...newJob, _token: tokens.u1 });
    expect(response.statusCode).toEqual(403);
  });
});

describe("PATCH /jobs/:id", function () {
  it("should modify an existing job", async function () {
    const newJob = {
      title: "nj",
      salary: 55000,
      equity: 0.45,
    };
    let response = await request(app)
      .patch(`/jobs/${testJob.id}`)
      .send({ ...newJob, _token: tokens.u2 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.job).toEqual({
      ...testJob,
      ...newJob,
      date_posted: expect.any(String),
    });
    response = await request(app)
      .get(`/jobs/${testJob.id}`)
      .send({ _token: tokens.u2 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.job).toEqual({
      ...testJob,
      ...newJob,
      date_posted: expect.any(String),
      company: testCompany,
    });
  });
  it("should deny access if no token is present", async function () {
    const newJob = {
      title: "nj",
      salary: 55000,
      equity: 0.45,
    };
    let response = await request(app).patch(`/jobs/${testJob.id}`).send(newJob);
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token is present", async function () {
    const newJob = {
      title: "nj",
      salary: 55000,
      equity: 0.45,
    };
    let response = await request(app)
      .patch(`/jobs/${testJob.id}`)
      .send({ ...newJob, _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should deny access if user is not admin", async function () {
    const newJob = {
      title: "nj",
      salary: 55000,
      equity: 0.45,
    };
    let response = await request(app)
      .patch(`/jobs/${testJob.id}`)
      .send({ ...newJob, _token: tokens.u1 });
    expect(response.statusCode).toEqual(403);
  });
  it("should return a 404 if id is invalid", async function () {
    const newJob = {
      title: "nj",
      salary: 55000,
      equity: 0.45,
    };
    let response = await request(app)
      .patch(`/jobs/0`)
      .send({ ...newJob, _token: tokens.u2 });
    expect(response.statusCode).toEqual(404);
  });
});

describe("DELETE /jobs/:id", function () {
  it("should delete an existing job", async function () {
    let response = await request(app)
      .delete(`/jobs/${testJob.id}`)
      .send({ _token: tokens.u2 });
    expect(response.statusCode).toEqual(200);
  });
  it("should deny access if no token is present", async function () {
    let response = await request(app).delete(`/jobs/${testJob.id}`);
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token is present", async function () {
    let response = await request(app)
      .delete(`/jobs/${testJob.id}`)
      .send({ _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should deny access if user is not admin", async function () {
    let response = await request(app)
      .delete(`/jobs/${testJob.id}`)
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(403);
  });
  it("should return a 404 if id is invalid", async function () {
    let response = await request(app)
      .delete(`/jobs/0`)
      .send({ _token: tokens.u2 });
    expect(response.statusCode).toEqual(404);
  });
});

afterAll(function () {
  db.end();
});
