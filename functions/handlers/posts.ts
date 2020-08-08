import { db } from "../util/admin"
import { Request, Response } from "express"

export const getAllPosts = async (_req: Request, res: Response) => {
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
}

export const createPost = async (req: Request, res: Response) => {
	if (req.body.body.trim() === "")
		return res.status(400).json({ body: "Body must not be empty" })

	const newPost = {
		body: req.body.body || "",
		userHandle: req.user?.handle,
		userImage: req.user?.imageUrl,
		createdAt: new Date().toISOString(),
		postId: "",
		likeCount: 0,
		commentCount: 0,
	}

	try {
		const post = await db.collection("posts").add(newPost)
		const resPost = newPost
		resPost.postId = post.id
		return res.json({
			message: `Document ${post.id} created successfully`,
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: "something went wrong" })
	}
}

export const getPost = async (req: Request, res: Response) => {
	try {
		const postDoc = await db.doc(`/posts/${req.params.postId}`).get()

		if (!postDoc.exists)
			return res.status(400).json({ error: "Post not found" })

		const postData = postDoc.data() || {}
		postData.postId = postDoc.id
		const comments = await db
			.collection("comments")
			.orderBy("createdAt", "desc")
			.where("postId", "==", req.params.postId)
			.get()
		postData.comments = []
		comments.forEach((comment) => postData.comments.push(comment.data()))
		return res.json(postData)
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.code })
	}
}

export const commentOnPost = async (req: Request, res: Response) => {
	if (req.body.body.trim() === "")
		return res.status(400).json({ error: "Must not be empty" })

	const newComment = {
		body: req.body.body,
		createdAt: new Date().toISOString(),
		postId: req.params.postId,
		userHandle: req.user?.handle,
		userImage: req.user?.imageUrl,
	}

	try {
		const post = await db.doc(`/posts/${req.params.postId}`).get()
		if (!post.exists)
			return res.status(404).json({ error: "Post not found" })
		await post.ref.update({ commentCount: post.data()?.commentCount + 1 })
		await db.collection("comments").add(newComment)
		return res.json(newComment)
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: "Something went wrong" })
	}
}

export const likePost = async (req: Request, res: Response) => {
	try {
		const postRef = db.doc(`/posts/${req.params.postId}`)
		const likeDoc = await db
			.collection("likes")
			.where("userHandle", "==", req.user?.handle)
			.where("postId", "==", req.params.postId)
			.limit(1)
			.get()

		const postDoc = await postRef.get()
		const postData = postDoc.data() || {}
		postData.postId = postRef.id

		if (likeDoc.empty) {
			await db.collection("likes").add({
				postId: req.params.postId,
				userHandle: req.user?.handle,
			})
			postData.likeCount++
			postRef.update({ likeCount: postData.likeCount })
			return res.json(postData)
		} else {
			return res.status(400).json({ error: "Post already liked" })
		}
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.code })
	}
}

export const unlikePost = async (req: Request, res: Response) => {
	try {
		const postRef = db.doc(`/posts/${req.params.postId}`)
		const likeDoc = await db
			.collection("likes")
			.where("userHandle", "==", req.user?.handle)
			.where("postId", "==", req.params.postId)
			.limit(1)
			.get()

		const postDoc = await postRef.get()
		const postData = postDoc.data() || {}
		postData.postId = postRef.id

		if (likeDoc.empty) {
			return res.status(400).json({ error: "Post not liked" })
		} else {
			await db.doc(`/likes/${likeDoc.docs[0].id}`).delete()
			postData.likeCount--
			postRef.update({ likeCount: postData.likeCount })
			return res.json(postData)
		}
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.code })
	}
}

export const deletePost = async (req: Request, res: Response) => {
	const postRef = db.doc(`/posts/${req.params.postId}`)

	try {
		const postDoc = await postRef.get()

		if (!postDoc.exists) {
			return res.status(404).json({ error: "Post not found" })
		}

		if (postDoc.data()?.userHandle !== req.user?.handle) {
			return res.status(403).json({ error: "User unauthorized" })
		} else {
			await postRef.delete()
			return res.json({ success: "Post deleted" })
		}
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err.code })
	}
}
