process.env.DATABASE_URL = "jobly-test-companies";

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
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM jobs");
  await db.query("DELETE FROM users");
});

describe("GET /companies", function () {
  beforeEach(async function () {
    let sampleCompanies = [
      ["handle2", "name2", 600, "desc2", "www.logo2.com"],
      ["handle3", "name3", 700, "desc3", "www.logo3.com"],
    ];
    for (let company of sampleCompanies) {
      const result = await db.query(
        `INSERT INTO companies
                    (handle, name, num_employees, description, logo_url)
                    VALUES
                    ($1, $2, $3, $4, $5)`,
        company
      );
    }
  });

  it("should return list of all companies when given no parameters", async function () {
    const response = await request(app)
      .get("/companies")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle1", name: "name1" },
      { handle: "handle2", name: "name2" },
      { handle: "handle3", name: "name3" },
    ]);
  });
  it("should deny access if no token present", async function () {
    const response = await request(app).get("/companies");
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token present", async function () {
    const response = await request(app)
      .get("/companies")
      .send({ _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should filter by name when passed a search parameter", async function () {
    const response = await request(app)
      .get("/companies?search=name1")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle1", name: "name1" },
    ]);
  });
  it("should appropriately filter by min_employees", async function () {
    const response = await request(app)
      .get("/companies?min_employees=550")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle2", name: "name2" },
      { handle: "handle3", name: "name3" },
    ]);
  });
  it("should appropriately filter by max_employees", async function () {
    const response = await request(app)
      .get("/companies?max_employees=650")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle1", name: "name1" },
      { handle: "handle2", name: "name2" },
    ]);
  });
  it("should appropriately filter by min & max employees", async function () {
    const response = await request(app)
      .get("/companies?min_employees=550&max_employees=650")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle2", name: "name2" },
    ]);
  });
  it("should throw an error if min_employees > max_employees", async function () {
    const response = await request(app)
      .get("/companies?min_employees=650&max_employees=550")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(400);
  });
});

describe("GET /companies/:handle", function () {
  it("should return detailed information on a single company", async function () {
    const response = await request(app)
      .get(`/companies/${testCompany.handle}`)
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.company).toEqual({
      ...testCompany,
      jobs: [{ ...testJob, date_posted: expect.any(String) }],
    });
  });
  it("should deny access if no token present", async function () {
    const response = await request(app).get(`/companies/${testCompany.handle}`);
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token present", async function () {
    const response = await request(app)
      .get(`/companies/${testCompany.handle}`)
      .send({ _token: badToken });
    expect(response.statusCode).toEqual(401);
  });

  it("should return a 404 if given an invalid handle", async function () {
    const response = await request(app)
      .get("/companies/not-a-valid-handle")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(404);
  });
});

describe("POST /companies", function () {
  it("should create a new company", async function () {
    const newCompany = {
      handle: "nh",
      name: "nn",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .post(`/companies`)
      .send({ ...newCompany, _token: tokens.u2 });
    expect(response.statusCode).toEqual(201);
    expect(response.body.company).toEqual(newCompany);
    response = await request(app)
      .get(`/companies/${newCompany.handle}`)
      .send({ _token: tokens.u2 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.company).toEqual({ ...newCompany, jobs: [] });
  });
  it("should deny access if no token present", async function () {
    const newCompany = {
      handle: "nh",
      name: "nn",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app).post(`/companies`);
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token present", async function () {
    const newCompany = {
      handle: "nh",
      name: "nn",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .post(`/companies`)
      .send({ ...newCompany, _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should deny access if user is not admin", async function () {
    const newCompany = {
      handle: "nh",
      name: "nn",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .post(`/companies`)
      .send({ ...newCompany, _token: tokens.u1 });
    expect(response.statusCode).toEqual(403);
  });
  it("should return a 401 if name is not unique", async function () {
    const newCompany = {
      handle: "nh",
      name: "name1",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .post(`/companies`)
      .send({ ...newCompany, _token: tokens.u2 });
    expect(response.statusCode).toEqual(401);
  });
  it("should return a 401 if handle is not unique", async function () {
    const newCompany = {
      handle: "handle1",
      name: "nn",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .post(`/companies`)
      .send({ ...newCompany, _token: tokens.u2 });
    expect(response.statusCode).toEqual(401);
  });
});

describe("PATCH /companies/:handle", function () {
  it("should modify an existing company", async function () {
    const newCompany = {
      name: "nn",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .patch(`/companies/${testCompany.handle}`)
      .send({ ...newCompany, _token: tokens.u2 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.company).toEqual({ ...testCompany, ...newCompany });
    response = await request(app)
      .get(`/companies/${testCompany.handle}`)
      .send({ _token: tokens.u2 });
    expect(response.statusCode).toEqual(200);
    expect(response.body.company).toEqual({
      ...testCompany,
      ...newCompany,
      jobs: [{ ...testJob, date_posted: expect.any(String) }],
    });
  });
  it("should deny access if no token present", async function () {
    const newCompany = {
      name: "nn",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .patch(`/companies/${testCompany.handle}`)
      .send({ newCompany });
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token present", async function () {
    const newCompany = {
      name: "nn",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .patch(`/companies/${testCompany.handle}`)
      .send({ ...newCompany, _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should deny access if user is not admin", async function () {
    const newCompany = {
      name: "nn",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .patch(`/companies/${testCompany.handle}`)
      .send({ ...newCompany, _token: tokens.u1 });
    expect(response.statusCode).toEqual(403);
  });
  it("should return a 404 if handle is invalid", async function () {
    const newCompany = {
      name: "name1",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app)
      .patch(`/companies/not-a-valid-handle`)
      .send({ ...newCompany, _token: tokens.u2 });
    expect(response.statusCode).toEqual(404);
  });
});

describe("DELETE /companies/:handle", function () {
  it("should delete an existing company", async function () {
    let response = await request(app)
      .delete(`/companies/${testCompany.handle}`)
      .send({ _token: tokens.u2 });
    expect(response.statusCode).toEqual(200);
  });
  it("should deny access if no token present", async function () {
    let response = await request(app).delete(
      `/companies/${testCompany.handle}`
    );
    expect(response.statusCode).toEqual(403);
  });
  it("should deny access if malformed token present", async function () {
    let response = await request(app)
      .delete(`/companies/${testCompany.handle}`)
      .send({ _token: badToken });
    expect(response.statusCode).toEqual(401);
  });
  it("should deny access if user is not admin", async function () {
    let response = await request(app)
      .delete(`/companies/${testCompany.handle}`)
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toEqual(403);
  });
  it("should return a 404 if handle is invalid", async function () {
    let response = await request(app)
      .delete(`/companies/not-a-valid-handle`)
      .send({ _token: tokens.u2 });
    expect(response.statusCode).toEqual(404);
  });
});

afterAll(function () {
  db.end();
});
