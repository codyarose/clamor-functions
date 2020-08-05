import * as functions from "firebase-functions"
import fs from "fs"

import * as ENV from "./env.json"

let config = functions.config().env

if (process.env.NODE_ENV !== "production") {
	if (fs.existsSync("./env.json")) {
		const env = ENV

		config = env
	}
}

export default config
