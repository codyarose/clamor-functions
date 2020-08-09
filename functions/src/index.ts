import * as functions from "firebase-functions"
import firebase from "firebase"
import express, { Express } from "express"

import { db } from "../util/admin"

import {
	getAllPosts,
	createPost,
	getPost,
	commentOnPost,
	likePost,
	unlikePost,
	deletePost,
} from "../handlers/posts"
import {
	signup,
	login,
	uploadImage,
	addUserDetails,
	getAuthenticatedUser,
	getUserDetails,
	markNotificationsRead,
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
app.post("/post/:postId/comment", FBAuth, commentOnPost)
app.get("/post/:postId/like", FBAuth, likePost)
app.get("/post/:postId/unlike", FBAuth, unlikePost)
app.delete("/post/:postId", FBAuth, deletePost)

// User routes
app.post("/signup", signup)
app.post("/login", login)
app.post("/user/image", FBAuth, uploadImage)
app.post("/user", FBAuth, addUserDetails)
app.get("/user", FBAuth, getAuthenticatedUser)
app.get("/user/:handle", getUserDetails)
app.post("/notifications", FBAuth, markNotificationsRead)

exports.api = functions.https.onRequest(app)

exports.createNotificationOnLike = functions
	.region("us-central1")
	.firestore.document("likes/{id}")
	.onCreate(async (snapshot) => {
		try {
			const postDoc = await db
				.doc(`/posts/${snapshot.data().postId}`)
				.get()
			if (postDoc.exists) {
				return db.doc(`/notifications/${snapshot.id}`).set({
					createdAt: new Date().toISOString(),
					recipient: postDoc.data()?.userHandle,
					sender: snapshot.data().userHandle,
					type: "like",
					read: false,
					postId: postDoc.id,
				})
			}
			return
		} catch (err) {
			console.error(err)
			return
		}
	})

exports.deleteNotificationOnUnlike = functions
	.region("us-central1")
	.firestore.document("likes/{id}")
	.onDelete(async (snapshot) => {
		console.log(snapshot)
		try {
			return await db.doc(`/notifications/${snapshot.id}`).delete()
		} catch (err) {
			console.error(err)
			return
		}
	})

exports.createNotificationOnComment = functions
	.region("us-central1")
	.firestore.document("comments/{id}")
	.onCreate(async (snapshot) => {
		try {
			const postDoc = await db
				.doc(`/posts/${snapshot.data().postId}`)
				.get()
			if (postDoc.exists) {
				return await db.doc(`/notifications/${snapshot.id}`).set({
					createdAt: new Date().toISOString(),
					recipient: postDoc.data()?.userHandle,
					sender: snapshot.data().userHandle,
					type: "comment",
					read: false,
					postId: postDoc.id,
				})
			}
			return
		} catch (err) {
			console.error(err)
			return
		}
	})
