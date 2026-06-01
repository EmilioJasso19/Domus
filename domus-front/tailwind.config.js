/** @type {import('tailwindcss').Config} */
module.exports = {
	// NOTE: Update this to include the paths to all files that contain Nativewind classes.
	content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			fontFamily: {
				nunito: ["Nunito_400Regular"],
				"nunito-semibold": ["Nunito_600SemiBold"],
				"nunito-bold": ["Nunito_700Bold"],
				"nunito-extrabold": ["Nunito_800ExtraBold"],
			},
		},
	},
	plugins: [],
};