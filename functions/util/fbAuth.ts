import { admin, db } from "./admin"
import { Request, Response, NextFunction } from "express"

export const FBAuth = async (
	req: Request,
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
