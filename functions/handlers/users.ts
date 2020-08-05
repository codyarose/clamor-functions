import { db } from "../util/admin"
import { Request, Response } from "express"
import firebase from "firebase"

import config from "../util/config"
import { validateSignupData, validateLoginData } from "../util/validators"

firebase.initializeApp(config)

export const signup = async (req: Request, res: Response) => {
	const newUser = {
		...req.body,
	}

	const { valid, errors } = validateSignupData(newUser)

	if (!valid) return res.status(400).json(errors)

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
}

export const login = async (req: Request, res: Response) => {
	const user = {
		...req.body,
	}

	const { valid, errors } = validateLoginData(user)

	if (!valid) return res.status(400).json(errors)

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
}
