const mongoose = require("mongoose")
const supertest = require("supertest")
const bcrypt = require("bcrypt")
const app = require("../app")
const helper = require("./test_helper")

const Note = require("../models/note")
const User = require("../models/user")

const api = supertest(app)

describe("Note CRUD tests", () => {
  beforeEach(async () => {
    await Note.deleteMany({})

    const noteObjects = helper.initialNotes.map((n) => {
      return new Note(n)
    })
    const promiseArray = noteObjects.map((n) => {
      return n.save()
    })
    await Promise.all(promiseArray)
  }, 100000)

  describe("when there is initially some note saved", () => {
    test("notes are returned as json", async () => {
      await api
        .get("/api/notes")
        .expect(200)
        .expect("Content-Type", /application\/json/)
    }, 10000)

    test("all notes returned", async () => {
      const response = await api.get("/api/notes")

      expect(response.body).toHaveLength(helper.initialNotes.length)
    }, 10000)

    test("the first note is about HTTP methods", async () => {
      const response = await api.get("/api/notes")

      const contents = response.body.map((res) => res.content)
      expect(contents).toContain("HTML is easy")
    })
  })

  describe("viewing a specific note", () => {
    test("a specific note can be viewed", async () => {
      const notesAtStart = await helper.notesInDb()

      const noteToView = notesAtStart[0]

      const resultNote = await api
        .get(`/api/notes/${noteToView.id}`)
        .expect(200)
        .expect("Content-Type", /application\/json/)

      const processedNoteToView = JSON.parse(JSON.stringify(noteToView))

      expect(resultNote.body).toEqual(processedNoteToView)
    })
    //add 404 doesnt exists and 400 id invalid
    test("fails with 404 - not found if note with provided id doesnt exist", async () => {
      const nonExistingId = await helper.nonExistingId()

      await api.get(`/api/notes/${nonExistingId}`).expect(404)
    })
    test("fails with 400 - bad request if id is invalid", async () => {
      const invalidId = 1020202

      await api.get(`/api/notes/${invalidId}`).expect(400)
    })
  })

  describe("addition of a new note", () => {
    test("suceeds with valid data", async () => {
      const user = await User.findOne({ username: "root" })

      const newNote = {
        content: "async/await simplifies making async calls",
        important: true,
        userId: user._id,
      }

      //login

      const loggedInUser = await api
        .post("/api/login")
        .send({ username: "root", password: "sekret" })

      await api
        .post("/api/notes")
        .send(newNote)
        .set("Authorization", `Bearer ${loggedInUser.body.token}`)
        .expect(201)
        .expect("Content-Type", /application\/json/)

      const notesAtEnd = await helper.notesInDb()

      const contents = notesAtEnd.map((r) => r.content)

      expect(notesAtEnd).toHaveLength(helper.initialNotes.length + 1)
      expect(contents).toContain("async/await simplifies making async calls")
    })
    test("fails with status code 400 - bad request if data is not valid", async () => {
      const user = await User.findOne({ username: "root" })

      const newNote = {
        important: "true",
        userId: user._id,
      }

      await api.post("/api/notes").send(newNote).expect(400)

      const notesAtEnd = await helper.notesInDb()

      expect(notesAtEnd).toHaveLength(helper.initialNotes.length)
    })
  })

  describe("deletion of a note", () => {
    test("succeeds with status code 204 if id is valid", async () => {
      const notesAtStart = await helper.notesInDb()

      const noteToDelete = notesAtStart[0]

      await api.delete(`/api/notes/${noteToDelete.id}`).expect(204)

      const notesAtEnd = await helper.notesInDb()

      expect(notesAtEnd).toHaveLength(helper.initialNotes.length - 1)

      const contents = notesAtEnd.map((n) => n.content)

      expect(contents).not.toContain(noteToDelete.content)
    })
  })
})

describe("User tests", () => {
  describe("when there is initially one user in db", () => {
    beforeEach(async () => {
      await User.deleteMany({})

      const passwordHash = await bcrypt.hash("sekret", 10)

      const user = new User({
        username: "root",
        name: "root",
        passwordHash: passwordHash,
      })

      await user.save()
    })

    test("creation succeeds with a fresh username", async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        name: "Brian",
        username: "Brian",
        password: "awit",
      }

      await api
        .post("/api/users")
        .send(newUser)
        .expect(201)
        .expect("Content-Type", /application\/json/)

      const usersAtEnd = await helper.usersInDb()

      expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)

      const usernames = usersAtEnd.map((u) => u.username)
      expect(usernames).toContain(newUser.name)
    })

    test("creation fails with proper statuscode and message if username is already taken", async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        name: "root",
        username: "root",
        password: "root",
      }

      const result = await api
        .post("/api/users")
        .send(newUser)
        .expect(400)
        .expect("Content-Type", /application\/json/)

      expect(result.body.error).toContain("username must be unique")

      const usersAtEnd = await helper.usersInDb()
      expect(usersAtEnd).toEqual(usersAtStart)
    })
  })
})

afterAll(() => {
  mongoose.connection.close()
})
