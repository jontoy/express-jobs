process.env.NODE_ENV = "test";

const app = require("../../app");
const request = require("supertest");
const db = require("../../db");

let testCompany;
beforeEach(async function () {
  const result = await db.query(
    `INSERT INTO companies
            (handle, name, num_employees, description, logo_url)
            VALUES
            ($1, $2, $3, $4, $5)
            RETURNING handle, name, num_employees, description, logo_url`,
    ["handle1", "name1", 500, "desc1", "www.logo1.com"]
  );
  testCompany = result.rows[0];
});

afterEach(async function () {
  await db.query("DELETE FROM companies");
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
    const response = await request(app).get("/companies");
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle1", name: "name1" },
      { handle: "handle2", name: "name2" },
      { handle: "handle3", name: "name3" },
    ]);
  });
  it("should filter by name when passed a search parameter", async function () {
    const response = await request(app).get("/companies?search=name1");
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle1", name: "name1" },
    ]);
  });
  it("should appropriately filter by min_employees", async function () {
    const response = await request(app).get("/companies?min_employees=550");
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle2", name: "name2" },
      { handle: "handle3", name: "name3" },
    ]);
  });
  it("should appropriately filter by max_employees", async function () {
    const response = await request(app).get("/companies?max_employees=650");
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle1", name: "name1" },
      { handle: "handle2", name: "name2" },
    ]);
  });
  it("should appropriately filter by min & max employees", async function () {
    const response = await request(app).get(
      "/companies?min_employees=550&max_employees=650"
    );
    expect(response.statusCode).toEqual(200);
    expect(response.body.companies).toEqual([
      { handle: "handle2", name: "name2" },
    ]);
  });
  it("should throw an error if min_employees > max_employees", async function () {
    const response = await request(app).get(
      "/companies?min_employees=650&max_employees=550"
    );
    expect(response.statusCode).toEqual(400);
  });
});

describe("GET /companies/:handle", function () {
  it("should return detailed information on a single company", async function () {
    const response = await request(app).get(`/companies/${testCompany.handle}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body.company).toEqual(testCompany);
  });
  it("should return a 404 if given an invalid handle", async function () {
    const response = await request(app).get("/companies/not-a-valid-handle");
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
    let response = await request(app).post(`/companies`).send(newCompany);
    expect(response.statusCode).toEqual(201);
    expect(response.body.company).toEqual(newCompany);
    response = await request(app).get(`/companies/${newCompany.handle}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body.company).toEqual(newCompany);
  });
  it("should return a 401 if name is not unique", async function () {
    const newCompany = {
      handle: "nh",
      name: "name1",
      num_employees: 10,
      description: "nd",
      logo_url: "www.url.com",
    };
    let response = await request(app).post(`/companies`).send(newCompany);
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
    let response = await request(app).post(`/companies`).send(newCompany);
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
      .send(newCompany);
    expect(response.statusCode).toEqual(200);
    expect(response.body.company).toEqual({ ...testCompany, ...newCompany });
    response = await request(app).get(`/companies/${testCompany.handle}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body.company).toEqual({ ...testCompany, ...newCompany });
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
      .send(newCompany);
    expect(response.statusCode).toEqual(404);
  });
});

describe("DELETE /companies/:handle", function () {
  it("should delete an existing company", async function () {
    let response = await request(app).delete(
      `/companies/${testCompany.handle}`
    );
    expect(response.statusCode).toEqual(200);
  });
  it("should return a 404 if handle is invalid", async function () {
    let response = await request(app).delete(`/companies/not-a-valid-handle`);
    expect(response.statusCode).toEqual(404);
  });
});

afterAll(function () {
  db.end();
});
