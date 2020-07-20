const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

const createToken = (username, is_admin = false) => {
  return jwt.sign({ username, is_admin }, SECRET_KEY);
};

module.exports = createToken;
