export {}

declare global {
	namespace Express {
		interface Request {
			user?: {
				uid?: string
				handle?: string
			}
		}
	}
}
