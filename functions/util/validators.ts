const isEmpty = (string: string) => (string.trim() === "" ? true : false)
const isEmail: (email: string) => boolean = (email: string) => {
	const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
	return email.match(emailRegEx) ? true : false
}

export const validateSignupData = (data: {
	email: string
	password: string
	handle: string
	confirmPassword: string
}) => {
	const errors: {
		email?: string
		password?: string
		confirmPassword?: string
		handle?: string
	} = {}

	// Check valid email
	isEmpty(data.email)
		? (errors.email = "Must not be empty")
		: !isEmail(data.email) &&
		  (errors.email = "Must be a valid email address")
	// Check not empty
	isEmpty(data.password) && (errors.password = "Must not be empty")
	isEmpty(data.handle) && (errors.handle = "Must not be empty")
	// Check passwords match
	data.password !== data.confirmPassword &&
		(errors.confirmPassword = "Passwords must match")

	return {
		errors,
		valid: Object.keys(errors).length === 0 ? true : false,
	}
}

export const validateLoginData = (data: {
	email: string
	password: string
}) => {
	const errors: {
		email?: string
		password?: string
	} = {}

	isEmpty(data.email) && (errors.email = "Must not be empty")
	isEmpty(data.password) && (errors.password = "Must not be empty")

	return {
		errors,
		valid: Object.keys(errors).length === 0 ? true : false,
	}
}
