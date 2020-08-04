import * as functions from "firebase-functions"
import fs from "fs"

let config = functions.config().env

if (process.env.NODE_ENV !== "production") {
	if (fs.existsSync("./env.json")) {
		const env = require("./env.json")

		config = env
	}
}

export default config
