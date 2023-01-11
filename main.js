const express = require("express")
const app = express()
const bcrypt = require("bcrypt")
const { pool } = require("./dbConfig")
const flash = require("express-flash")
const session = require("express-session")
const passport = require("passport")
const inizializePassport = require("./passportConfig")
const PORT = process.env.PORT || 3100

inizializePassport(passport)

// MIDDLEWARES
app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: "cats",
  resave: false,
  saveUninitialized: false,
}))
app.use(passport.session())
app.use(passport.initialize())


function checkAuthenticated(req, res, done) {
  if (req.isAuthenticated()) {
    return res.redirect("/")
  }
  done()
}
function checkNotAuthenticated(req, res, done) {
  if (req.isAuthenticated()) {
    return done()
  }
  res.redirect("/login")
}

// GET
app.get("/login", checkAuthenticated, (req, res) => {
  res.render("login")
})
app.get("/", checkNotAuthenticated, async (req, res) => {
  const { id, nombre: user } = req.user
  const result = await pool.query(`SELECT * FROM tareas WHERE id_usuario = $1`, [id])
  console.log(result.rows)
  const tareas = result.rows.map(tarea => {
    const descripcion = tarea.descripcion
    return descripcion
  })
  res.render("dashboard", { user, tareas })
})
app.get("/register", checkAuthenticated, (req, res) => {
  res.render("register")
})
app.get("/nueva-contrasena", (req, res) => {
  res.render("recuperarPassword")
})
app.get("/logout", (req, res) => {
  req.logout(err => { if (err) { throw err } })
  req.flash("Se cerró la sesión con éxito")
  res.redirect("/login")
})


// POST
app.post("/register", async (req, res) => {
  let { name, email, password, password2 } = req.body
  let errors = []
  if (!name || !email || !password || !password2) { errors.push({ message: "Debe completar todos los campos" }) }
  if (password !== password2) { errors.push({ message: "Las contraseñas no coinciden" }) }
  if (errors.length > 0) {
    res.render("register", { errors })
  } else {
    // ENCRIPTACION DE CONTRASEÑA
    let encriptPassword = await bcrypt.hash(password, 10)
    console.log(encriptPassword)

    pool.query(`SELECT * FROM usuarios WHERE correo = $1`, [email], (err, result) => {
      if (err) { throw err }
      console.log(result.rows)
      if (result.rows.length > 0) {
        errors.push({ message: "El usuario ya existe" })
        res.render("register", { errors })
      } else {
        pool.query(`INSERT INTO usuarios (correo, nombre, contrasena) VALUES ($1, $2, $3) RETURNING correo, contrasena`, [email, name, encriptPassword], (err, result) => {
          if (err) { throw err }
          console.log(result.rows)
          req.flash("success_message", "Cuenta creada con éxito")
          res.redirect("/login")
        })
      }

    })
  }
})
app.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true
}))
app.post("/nueva-contrasena", async (req, res) => {
  let { email, password, password2 } = req.body
  let errors = []
  console.log(req.body)
  if (!email || !password || !password2) { errors.push({ message: "Debe completar todos los campos" }) }
  if (password !== password2) {
    errors.push({ message: "Las contraseñas deben ser iguales" })
  }
  if (errors.length > 0) {
    res.render("recuperarPassword", { errors })
  } else {
    // ENCRIPTACION DE CONTRASEÑA
    let encriptPassword = await bcrypt.hash(password, 10)
    console.log(encriptPassword)

    pool.query(`UPDATE usuarios SET contrasena = $1 WHERE correo = $2 RETURNING correo, contrasena`, [encriptPassword, email], (err, result) => {
      if (err) { throw err }
      console.log(result.rows)
      req.flash("success_message", "Contraseña modificada con éxito")
      res.redirect("/login")
    })
  }
})


// TODO LIST
let tareas = []
app.post("/", async (req, res) => {
  const { task } = req.body
  const { id, nombre: user } = req.user
  try {
    const result = await pool.query(`INSERT INTO tareas(id_usuario, descripcion) VALUES($1, $2) RETURNING id_usuario, descripcion`, [id, task])

    const { descripcion } = result.rows[0]
    console.log(descripcion)
    tareas.push(descripcion)
    res.render("dashboard", { user, tareas })
  } catch (err) {
    throw err
  }
})
app.get("/delete", async (req, res) => {
  const { id } = req.user
  try {
    const result = await pool.query(`SELECT * FROM tareas WHERE id_usuario = $1`, [id])
    const { id_tarea } = result.rows[0]
    pool.query(`DELETE FROM tareas WHERE id_tarea = $1`, [id_tarea])
    res.redirect("/")
  } catch (error) {

  }
})
// app.get("/edit/:id", checkNotAuthenticated, async (req, res) => {
//   const { id } = req.params
//   console.log(id)
//   const result = await pool.query(`SELECT * FROM tareas WHERE id_tarea = $1`, [id])
//   console.log(result.rowCount)
//   if (result.rowCount > 0) {
//     res.render("edit", { list: result.rows[0] });
//   } else {
//     res.send("No se encontro una tarea con el id especificado")
//   }
// })
// app.post("/edit/:id", checkNotAuthenticated, async (req, res) => {
//   const { id } = req.params
//   const { id_tarea, descripcion } = req.body
//   await pool.query(`UPDATE tareas SET descripcion = $1 WHERE id_tarea = $2`, [descripcion, id])
//   res.redirect("/")
// })






app.listen(PORT, () => {
  console.log(`Serving on port: ${PORT}`)
})