import * as functions from "firebase-functions"
import firebase from "firebase"
import express, { Express } from "express"

import { getAllPosts, createPost } from "../handlers/posts"
import { signup, login } from "../handlers/users"
import { FBAuth } from "../util/fbAuth"

if (process.env.NODE_ENV === "development") {
	firebase.functions().useFunctionsEmulator("http://localhost:5001")
}

const app: Express = express()

// Post routes
app.get("/posts", getAllPosts)
app.post("/post", FBAuth, createPost)

// User routes
app.post("/signup", signup)
app.post("/login", login)

exports.api = functions.https.onRequest(app)
