process.env.NODE_ENV = "test";

const app = require("../../app");
const request = require("supertest");
const db = require("../../db");
const bcrypt = require("bcrypt");

async function _pwd(password) {
  return await bcrypt.hash(password, 1);
}
let testUser;
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
});

afterEach(async function () {
  await db.query("DELETE FROM users");
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
    });
  });
  it("should return a 404 if given an invalid handle", async function () {
    const response = await request(app).get("/users/not-a-valid-username");
    expect(response.statusCode).toEqual(404);
  });
});

describe("POST /users", function () {
  it("should create a new user", async function () {
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
    expect(response.body.user).toEqual(
      expect.objectContaining({
        ...newUser,
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

describe("PATCH /users/:username", function () {
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
      .send(newUser);
    expect(response.statusCode).toEqual(200);
    expect(response.body.user).toEqual(targetResponse);
    response = await request(app).get(`/users/${testUser.username}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body.user).toEqual(targetResponse);
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
      .send(newUser);
    expect(response.statusCode).toEqual(404);
  });
});

describe("DELETE /users/:username", function () {
  it("should delete an existing user", async function () {
    let response = await request(app).delete(`/users/${testUser.username}`);
    expect(response.statusCode).toEqual(200);
  });
  it("should return a 404 if username is invalid", async function () {
    let response = await request(app).delete(`/users/not-a-valid-username`);
    expect(response.statusCode).toEqual(404);
  });
});

afterAll(function () {
  db.end();
});
