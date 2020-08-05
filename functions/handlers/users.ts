import { db, admin } from "../util/admin"
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

	const noImg = "no-image.png"

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
			imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
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

export const uploadImage = async (req: Request, res: Response) => {
	const BusBoy = require("busboy")
	const path = require("path")
	const os = require("os")
	const fs = require("fs")

	const busboy = new BusBoy({ headers: req.headers })

	let imageFileName: string,
		imageToBeUploaded: {
			filePath: string
			mimetype?: unknown
		} = {
			filePath: "",
		}

	busboy.on(
		"file",
		(
			_fieldname: string,
			file: any,
			filename: string,
			_encoding: string,
			mimetype: string
		) => {
			if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
				return res
					.status(400)
					.json({ error: "Wrong file type submitted" })
			}
			const imageExtension = filename.split(".")[
				filename.split(".").length - 1
			]
			imageFileName = `${Math.round(
				Math.random() * 100000000000
			)}.${imageExtension}`
			const filePath = path.join(os.tmpdir(), imageFileName)
			imageToBeUploaded = { filePath, mimetype }
			file.pipe(fs.createWriteStream(filePath))
			return
		}
	)
	busboy.on("finish", async () => {
		try {
			await admin
				.storage()
				.bucket()
				.upload(imageToBeUploaded.filePath, {
					resumable: false,
					metadata: {
						metadata: {
							contentType: imageToBeUploaded.mimetype,
						},
					},
				})
			const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
			await db.doc(`/users/${req.user?.handle}`).update({ imageUrl })
			return res.json({ message: "Image uploaded successfully" })
		} catch (err) {
			return res.status(500).json({ error: err.code })
		}
	})
	busboy.end(req.rawBody)
}
