const LocalStrategy = require("passport-local").Strategy
const { pool } = require("./dbConfig")
const bcrypt = require("bcrypt")

function inizialize(passport) {
  const authUser = (email, password, done) => {
    pool.query(`SELECT * FROM usuarios WHERE correo = $1`, [email], (err, result) => {
      if (err) { throw err }
      if (result.rows.length > 0) {
        const user = result.rows[0]
        bcrypt.compare(password, user.contrasena, (err, isMatch) => {
          if (err) { throw err }

          return isMatch ? done(null, user) : done(null, false, {
            message: "Contraseña inválida",
          })
        })
      } else {
        return done(null, false, {
          message: "Correo electrónico no registrado"
        })
      }
    })
  }

  passport.use(new LocalStrategy({ usernameField: "email", passwordField: "password" }, authUser))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    pool.query(`SELECT * FROM usuarios WHERE id = $1`, [id], (err, result) => {
      if (err) { throw err }
      return done(null, result.rows[0])
    })
  })

}

module.exports = inizialize