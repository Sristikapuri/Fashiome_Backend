// uuid@14 ships as ESM-only, which Jest's CJS runtime can't parse without
// extra transform config. The app only uses uuid for generating upload
// filenames, which the test suite never exercises, so a tiny CJS shim
// backed by Node's built-in crypto is enough to satisfy the import.
const { randomUUID } = require("node:crypto");

module.exports = { v4: randomUUID };
