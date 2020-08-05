import envConfig from "../config"

const firebaseConfig = {
	apiKey: envConfig.firebase.API_KEY,
	authDomain: envConfig.firebase.AUTH_DOMAIN,
	databaseURL: envConfig.firebase.DB_URL,
	projectId: envConfig.firebase.PID,
	storageBucket: envConfig.firebase.SB,
	messagingSenderId: envConfig.firebase.MSID,
	appId: envConfig.firebase.APPID,
	measurementId: envConfig.firebase.MID,
}

export default firebaseConfig
