export interface Errors {
	email?: string
	password?: string
	confirmPassword?: string
	handle?: string
}

export interface ValidateData {
	errors: Errors
	valid: boolean
}
