export interface User {
	imageUrl?: string
	createdAt?: Date
	userId?: string
	handle?: string
	email?: string
}

export interface Posts {
	body: string
	createdAt: Date
	userHandle: string
	userImage: string
	likeCount: number
	commentCount: number
	postId: string
}

export interface Credentials {
	email?: string
	handle?: string
	imageUrl?: string
	userId?: string
	createdAt?: Date
}

export interface Likes {
	userHandle: string
	postId: string
}

export interface Notification {
	recipient: string
	sender: string
	createdAt: Date
	postId: string
	type: 'like' | 'comment'
	read: boolean
	notifications: string
}
