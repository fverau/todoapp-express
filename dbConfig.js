const { Pool } = require("pg")

const config = {
  user: "postgres",
  host: "localhost",
  password: "1234",
  database: "usuariostodo",
}

const pool = new Pool(config)

module.exports = { pool }