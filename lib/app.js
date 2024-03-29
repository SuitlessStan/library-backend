"use strict"
import express from "express"
import { config } from "../config.js"
import Knex from "knex"
import { createRequire } from "module"
import { fileURLToPath } from "url"
import { AuthMiddleware, Middleware } from "./workflow/index.js"
import { cert, initializeApp } from "firebase-admin/app"
import cors from "cors"
import morgan from "morgan"


const app = express()
app.use(express.json())


class Server {
  constructor(_config) {
    this.fbApp = initializeApp(cert(config.firebase.serviceAccount), "firebase")

    this.knex = Knex({
      client: "mysql2",
      connection: {
        host: config.mysql.host,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        port: config.mysql.port || 3306,
        ssl: config.mysql.ssl || false,
      },
      pool: { min: 0, max: 20 },
    })

    this.middleware = new Middleware({
      knex: this.knex,
      fbApp: this.fbApp
    })

    this.authMiddleware = new AuthMiddleware({
      knex: this.knex,
      config: config,
      fbApp: this.fbApp
    })

    app.use(cors())
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))

    app.get("/v1/health", (req, res, next) => {
      res.context = { status: 200, content: "OK" }
      res.status(res.context.status).send(res.context.content)
      next()
    })

    app.get("/v1/users/:id/books", this.authMiddleware.authenticate(), this.middleware.getBooks.bind(this.middleware), (req, res) => {
        res.json({
          results: req.books,
          status: 200,
        })
      }
    )

    app.post("/v1/users/:id/books", this.authMiddleware.authenticate(), this.middleware.postBook.bind(this.middleware), (req, res) => {
      res.send({
        results: req.addBook,
        status: 200,
      })
    })

    app.delete("/v1/users/:id/books", this.authMiddleware.authenticate(), this.middleware.deleteBook.bind(this.middleware), (req, res) => {
      res.send({
        results: req.deleteBook,
        status: 200,
      })
    })

    app.patch("/v1/users/:id/books", this.authMiddleware.authenticate(), this.middleware.patchBook.bind(this.middleware), (req, res) => {
      res.send({
        results: req.patchBook,
        status: 200,
      })
    })

    app.use((err, req, res, next) => {
      console.error(err.stack)
      res.status(500).send("Something broke!")
    })
  }
}

const require = createRequire(import.meta.url)
const scriptPath = require.resolve(process.argv[1])
const modulePath = fileURLToPath(import.meta.url)
if (scriptPath === modulePath) {
  let _server = new Server(config)
  console.log("Server starting...")

  const server = app.listen(config.port, () => {
    console.log(`Server listening on port: ${config.port}`)
  })
}

export { Server, app }
