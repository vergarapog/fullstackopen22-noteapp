const notesRouter = require("express").Router()
const Note = require("../models/note")
const User = require("../models/user")
const jwt = require("jsonwebtoken")

notesRouter.get("/", async (request, response) => {
  const notes = await Note.find({}).populate("user", { name: 1, username: 1 })
  response.json(notes)
})

notesRouter.get("/:id", async (request, response, next) => {
  try {
    const note = await Note.findById(request.params.id)
    if (note) {
      response.json(note)
    } else {
      response.status(404).end()
    }
  } catch (error) {
    next(error)
  }
})

const getTokenFrom = (request) => {
  const authorization = request.get("authorization")
  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.substring(7)
  }
}

notesRouter.post("/", async (request, response, next) => {
  const body = request.body

  if (!body.content || !body.userId) {
    return response.status(400).json({ error: "invalid data" })
  }

  const token = getTokenFrom(request)
  let decodedToken
  try {
    decodedToken = jwt.verify(token, process.env.SECRET)
  } catch (err) {
    return next(err)
  }
  if (!token || !decodedToken.id) {
    return response.status(401).json({ error: "token missing or invalid" })
  }
  const user = await User.findById(decodedToken.id)

  const note = new Note({
    content: body.content,
    important: body.important || false,
    date: new Date(),
    user: user._id,
  })

  try {
    const savedNote = await note.save()

    user.notes = user.notes.concat(savedNote._id)
    await user.save()
    response.status(201).json(savedNote)
  } catch (error) {
    next(error)
  }
})

notesRouter.delete("/:id", async (request, response, next) => {
  try {
    await Note.findByIdAndRemove(request.params.id)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

notesRouter.put("/:id", (request, response, next) => {
  const body = request.body

  const newNote = { content: body.content, important: body.important }

  Note.findByIdAndUpdate(request.params.id, newNote, { new: true })
    .then((updatedNote) => {
      response.json(updatedNote)
    })
    .catch((err) => next(err))
})

module.exports = notesRouter
