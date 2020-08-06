import * as functions from "firebase-functions"
import firebase from "firebase"
import express, { Express } from "express"

import { getAllPosts, createPost, getPost } from "../handlers/posts"
import {
	signup,
	login,
	uploadImage,
	addUserDetails,
	getAuthenticatedUser,
} from "../handlers/users"
import { FBAuth } from "../util/fbAuth"

if (process.env.NODE_ENV === "development") {
	firebase.functions().useFunctionsEmulator("http://localhost:5001")
}

const app: Express = express()

// Post routes
app.get("/posts", getAllPosts)
app.post("/post", FBAuth, createPost)
app.get("/post/:postId", getPost)
// deletePost
// likePost
// unlikePost
// commentPost

// User routes
app.post("/signup", signup)
app.post("/login", login)
app.post("/user/image", FBAuth, uploadImage)
app.post("/user", FBAuth, addUserDetails)
app.get("/user", FBAuth, getAuthenticatedUser)

exports.api = functions.https.onRequest(app)
