import { db, admin } from '../util/admin'
import { Request, Response } from 'express'
import firebase from 'firebase'

import config from '../util/config'
import { User, Posts, Credentials, Notification, Likes } from './types'
import { validateSignupData, validateLoginData, reduceUserDetails } from '../util/validators'

firebase.initializeApp(config)

export const signup = async (req: Request, res: Response): Promise<unknown> => {
	const newUser = {
		...req.body,
	}

	const { valid, errors } = validateSignupData(newUser)

	if (!valid) return res.status(400).json(errors)

	const noImg = 'no-image.png'

	try {
		const user = await db.doc(`/users/${newUser.handle}`).get()

		if (user.exists) {
			return res.status(400).json({ handle: 'This username is already taken.' })
		}

		const createdUser: firebase.auth.UserCredential = await firebase
			.auth()
			.createUserWithEmailAndPassword(newUser.email, newUser.password)

		const token = await createdUser.user?.getIdToken()
		const userCredentials = {
			handle: newUser.handle,
			email: newUser.email,
			createdAt: new Date().toISOString(),
			imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
			userId: createdUser.user?.uid,
		}

		await db.doc(`/users/${newUser.handle}`).set(userCredentials)
		return res.status(201).json({ token })
	} catch (err) {
		console.error(err)
		if (err.code === 'auth/email-already-in-use') {
			return res.status(400).json({ email: 'Email is already in use' })
		} else {
			return res.status(500).json({ general: 'Something went wrong, please try again.' })
		}
	}
}

export const login = async (req: Request, res: Response): Promise<unknown> => {
	const user = {
		...req.body,
	}

	const { valid, errors } = validateLoginData(user)

	if (!valid) return res.status(400).json(errors)

	try {
		const signIn = await firebase.auth().signInWithEmailAndPassword(user.email, user.password)

		const token = await signIn.user?.getIdToken()

		return res.json({ token })
	} catch (err) {
		console.error(err)
		return res.status(403).json({ general: 'Wrong credentials, please try again' })
	}
}

export const addUserDetails = async (req: Request, res: Response): Promise<unknown> => {
	const userDetails = reduceUserDetails(req.body)

	try {
		await db.doc(`/users/${req.user?.handle}`).update(userDetails)
		return res.json({ message: 'Details added successfully' })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.code })
	}
}

export const getUserDetails = async (req: Request, res: Response): Promise<unknown> => {
	const userData: {
		user: User
		posts: Posts[]
	} = {
		user: {},
		posts: [],
	}
	try {
		const userDoc = await db.doc(`/users/${req.params.handle}`).get()
		if (!userDoc.exists) return res.status(404).json({ error: 'User not found' })

		userData.user = userDoc.data() as User
		const userPosts = await db
			.collection('posts')
			.where('userHandle', '==', req.params.handle)
			.orderBy('createdAt', 'desc')
			.get()
		userPosts.forEach((doc) => {
			userData.posts.push({
				body: doc.data().body,
				createdAt: doc.data().createdAt,
				userHandle: doc.data().userHandle,
				userImage: doc.data().userImage,
				likeCount: doc.data().likeCount,
				commentCount: doc.data().commentCount,
				postId: doc.id,
			})
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.code })
	}
	return res.json(userData)
}

export const getAuthenticatedUser = async (req: Request, res: Response): Promise<unknown> => {
	const userData: {
		credentials?: Credentials
		likes?: Likes[]
		notifications?: Notification[]
	} = {}

	try {
		const userDoc = await db.doc(`/users/${req.user?.handle}`).get()

		userData.credentials = userDoc.data()

		const userLikes = await db.collection('likes').where('userHandle', '==', req.user?.handle).get()

		userData.likes = []
		userLikes.forEach((doc) => userData.likes?.push(doc.data() as Likes))
		const userNotifications = await db
			.collection('notifications')
			.where('recipient', '==', req.user?.handle)
			.orderBy('createdAt', 'desc')
			.limit(10)
			.get()
		userData.notifications = []
		userNotifications.forEach((doc) =>
			userData.notifications?.push({
				recipient: doc.data().recipient,
				sender: doc.data().sender,
				createdAt: doc.data().createdAt,
				postId: doc.data().postId,
				type: doc.data().type,
				read: doc.data().read,
				notifications: doc.id,
			}),
		)
		return res.json(userData)
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.code })
	}
}

export const uploadImage = async (req: Request, res: Response): Promise<unknown> => {
	const { default: BusBoy } = await import('busboy')
	const path = await import('path')
	const os = await import('os')
	const fs = await import('fs')

	const busboy = new BusBoy({ headers: req.headers })

	let imageFileName: string,
		imageToBeUploaded: {
			filePath: string
			mimetype?: unknown
		} = {
			filePath: '',
		}

	busboy.on(
		'file',
		(_fieldname: string, file: NodeJS.ReadableStream, filename: string, _encoding: string, mimetype: string) => {
			if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
				return res.status(400).json({ error: 'Wrong file type submitted' })
			}
			const imageExtension = filename.split('.')[filename.split('.').length - 1]
			imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`
			const filePath = path.join(os.tmpdir(), imageFileName)
			imageToBeUploaded = { filePath, mimetype }
			file.pipe(fs.createWriteStream(filePath))
			return
		},
	)
	busboy.on('finish', async () => {
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
			return res.json({ message: 'Image uploaded successfully' })
		} catch (err) {
			return res.status(500).json({ error: err.code })
		}
	})
	busboy.end(req.rawBody)
	return
}

export const markNotificationsRead = async (req: Request, res: Response): Promise<unknown> => {
	try {
		const batch = db.batch()
		req.body.forEach((notificationId: string) => {
			const notification = db.doc(`/notifications/${notificationId}`)
			batch.update(notification, { read: true })
		})
		await batch.commit()
		return res.json({ message: 'Notifications marked read' })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.code })
	}
}
