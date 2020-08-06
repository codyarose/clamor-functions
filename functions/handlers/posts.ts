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
	if (req.body?.body.trim() === "") {
		return res.status(400).json({ body: "Body must not be empty" })
	}
	const newPost = {
		body: req.body?.body,
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
