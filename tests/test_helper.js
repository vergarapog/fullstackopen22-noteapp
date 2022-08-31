const Note = require("../models/note")
const User = require("../models/user")

const initialNotes = [
  {
    content: "HTML is easy",
    date: new Date(),
    important: false,
  },
  {
    content: "Browser can execute only Javascript",
    date: new Date(),
    important: true,
  },
]

const nonExistingId = async () => {
  const newNote = new Note({
    content: "Will be deleted soon",
    date: new Date(),
    important: false,
  })

  await newNote.save()
  await newNote.remove()

  return newNote._id.toString()
}

const notesInDb = async () => {
  const notes = await Note.find({})

  return notes.map((n) => {
    return n.toJSON()
  })
}

const usersInDb = async () => {
  const users = await User.find({})

  return users.map((u) => {
    return u.toJSON()
  })
}

module.exports = {
  initialNotes,
  nonExistingId,
  notesInDb,
  usersInDb,
}
