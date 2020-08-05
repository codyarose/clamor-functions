export {}

declare global {
	namespace Express {
		interface Request {
			rawBody: any
			user?: {
				uid?: string
				handle?: string
			}
		}
	}
}
