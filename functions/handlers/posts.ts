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
