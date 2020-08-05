import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import firebase from "firebase"
import { Express, Request, Response, NextFunction } from "express"
const express = require("express")

import config from "../config"

admin.initializeApp(functions.config().firebase)

if (process.env.NODE_ENV === "development") {
	firebase.functions().useFunctionsEmulator("http://localhost:5001")
}

const firebaseConfig = {
	apiKey: config.firebase.API_KEY,
	authDomain: config.firebase.AUTH_DOMAIN,
	databaseURL: config.firebase.DB_URL,
	projectId: config.firebase.PID,
	storageBucket: config.firebase.SB,
	messagingSenderId: config.firebase.MSID,
	appId: config.firebase.APPID,
	measurementId: config.firebase.MID,
}

firebase.initializeApp(firebaseConfig)

const db = admin.firestore()

const app: Express = express()

app.get("/posts", async (_req, res) => {
	const allPosts = await db
		.collection("posts")
		.orderBy("createdAt", "desc")
		.get()
	const posts: FirebaseFirestore.DocumentData[] = []
	for (const doc of allPosts.docs) {
		posts.push({
			postId: doc.id,
			body: doc.data().body,
			userHandle: doc.data().userHandle,
			createdAt: doc.data().createdAt,
		})
	}
	return res.json(posts)
})

interface UserAuthRequest extends Request {
	user?: {
		uid?: string
		handle?: string
	}
}

const FBAuth = async (
	req: UserAuthRequest,
	res: Response,
	next: NextFunction
) => {
	let idToken

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer ")
	) {
		idToken = req.headers.authorization.split("Bearer ")[1]
	} else {
		console.error("No token found")
		return res.status(403).json({ error: "Unauthorized" })
	}

	try {
		const decodedToken = await admin.auth().verifyIdToken(idToken)
		req.user = decodedToken
		console.log(decodedToken)
		const user = await db
			.collection("users")
			.where("userId", "==", req.user.uid)
			.limit(1)
			.get()
		req.user.handle = user.docs[0].data().handle
		next()
		return
	} catch (err) {
		console.error("Error while verifying token", err)
		return res.status(403).json(err)
	}
}

app.post("/post", FBAuth, async (req: UserAuthRequest, res) => {
	if (req.body.body.trim() === "") {
		return res.status(400).json({ body: "Body must not be empty" })
	}
	const newPost = {
		body: req.body.body,
		userHandle: req.user?.handle,
		createdAt: new Date().toISOString(),
	}

	try {
		const post = await db.collection("posts").add(newPost)
		return res.json({
			message: `Document ${post.id} created successfully`,
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: "something went wrong" })
	}
})

const isEmpty = (string: string) => (string.trim() === "" ? true : false)
const isEmail: (email: string) => boolean = (email: string) => {
	const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
	return email.match(emailRegEx) ? true : false
}

app.post("/signup", async (req, res) => {
	const newUser = {
		...req.body,
	}

	const errors: {
		email?: string
		password?: string
		confirmPassword?: string
		handle?: string
	} = {}

	// Check valid email
	isEmpty(newUser.email)
		? (errors.email = "Must not be empty")
		: !isEmail(newUser.email) &&
		  (errors.email = "Must be a valid email address")
	// Check not empty
	isEmpty(newUser.password) && (errors.password = "Must not be empty")
	isEmpty(newUser.handle) && (errors.handle = "Must not be empty")
	// Check passwords match
	newUser.password !== newUser.confirmPassword &&
		(errors.confirmPassword = "Passwords must match")

	// Return any errors
	if (Object.keys(errors).length > 0) return res.status(400).json(errors)

	try {
		const user = await db.doc(`/users/${newUser.handle}`).get()

		if (user.exists) {
			return res
				.status(400)
				.json({ handle: "This username is already taken." })
		}

		const createdUser: firebase.auth.UserCredential = await firebase
			.auth()
			.createUserWithEmailAndPassword(newUser.email, newUser.password)

		const token = await createdUser.user!.getIdToken()
		const userCredentials = {
			handle: newUser.handle,
			email: newUser.email,
			createdAt: new Date().toISOString(),
			userId: createdUser.user!.uid,
		}

		await db.doc(`/users/${newUser.handle}`).set(userCredentials)
		return res.status(201).json({ token })
	} catch (err) {
		console.error(err)
		if (err.code === "auth/email-already-in-use") {
			return res.status(400).json({ email: "Email is already in use" })
		} else {
			return res.status(500).json({ error: err.code })
		}
	}
})

app.post("/login", async (req, res) => {
	const user = {
		...req.body,
	}
	const errors: {
		email?: string
		password?: string
	} = {}

	isEmpty(user.email) && (errors.email = "Must not be empty")
	isEmpty(user.password) && (errors.password = "Must not be empty")

	if (Object.keys(errors).length > 0) return res.status(400).json(errors)

	try {
		const signIn = await firebase
			.auth()
			.signInWithEmailAndPassword(user.email, user.password)

		const token = await signIn.user?.getIdToken()

		return res.json({ token })
	} catch (err) {
		console.error(err)
		if (err.code === "auth/wrong-password") {
			return res
				.status(403)
				.json({ general: "Wrong credentials, please try again" })
		} else {
			return res.status(500).json({ error: err.code })
		}
	}
})

exports.api = functions.https.onRequest(app)
