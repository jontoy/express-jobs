const sqlForPartialUpdate = require("../../helpers/partialUpdate");

describe("partialUpdate()", () => {
  it("should generate a proper partial update query with just 1 field", function () {
    expect(
      sqlForPartialUpdate(
        "testTable",
        { testCol: "newValue" },
        "username",
        "testUser"
      )
    ).toEqual({
      query: `UPDATE testTable SET testCol=$1 WHERE username=$2 RETURNING *`,
      values: ["newValue", "testUser"],
    });
  });
  it("should generate a proper partial update query with just multiple field", function () {
    expect(
      sqlForPartialUpdate(
        "testTable",
        { col1: "val1", col2: "val2" },
        "username",
        "testUser"
      )
    ).toEqual({
      query: `UPDATE testTable SET col1=$1, col2=$2 WHERE username=$3 RETURNING *`,
      values: ["val1", "val2", "testUser"],
    });
  });
});
