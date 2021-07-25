const fs = require("fs");
const path = require("path");
const arg = require("arg");
const { default: fetch } = require("node-fetch");
const { RateLimiter } = require("limiter");
const convert = require("gd-level-to-json");

const limiter = new RateLimiter({
	tokensPerInterval: 100,
	interval: 300000
});

function parseResponse(responseBody) {
	if (!responseBody || responseBody == "-1") return {};
	if (responseBody.startsWith("\nWarning:")) responseBody = responseBody.split("\n").slice(2).join("\n").trim();
	if (responseBody.startsWith("<br />")) responseBody = responseBody.split("<br />").slice(2).join("<br />").trim();

	let response = responseBody.split("#")[0].split(":");
	let res = {};
	for (let i = 0; i < response.length; i += 2)
		res[response[i]] = response[i + 1];
	
	return res;
}

async function getLevelFromID(id, server) {
	let data;
	let remainingRequests = await limiter.removeTokens(1);

	if (remainingRequests < 0)
		return "-2";
	else {
		try {
			data = await fetch(server + "/downloadGJLevel22.php", {
				method: "POST",
				body: new URLSearchParams({ secret: "Wmfd2893gb7", gameVersion: "21", binaryVersion: "35", levelID: id })
			}).then(r => r.text());
			if (data == "-1")
				return "-1";

			data = parseResponse(data)[4] ? parseResponse(data)[4] : "-1";
		} catch {
			return "-1";
		}
	}

	return data;
}

async function cli(argv) {
	let args = arg({
		"--file": String,
		"--id": String,
		"--server": String,
		"-f": "--file",
		"-i": "--id",
		"-s": "--server",
	}, { argv });

	let options = {
		file: args["--file"],
		id: args["--id"],
		server: args["--server"],
	}

	if (!argv[0]) {
		return console.log([
			"  _                   _   _              _ ____   ___  _   _ \n | |    _____   _____| | | |_ ___       | / ___| / _ \\| \\ | |\n | |   / _ \\ \\ / / _ \\ | | __/ _ \\   _  | \\___ \\| | | |  \\| |\n | |__|  __/\\ V /  __/ | | || (_) | | |_| |___) | |_| | |\\  |\n |_____\\___| \\_/ \\___|_|  \\__\\___/   \\___/|____/ \\___/|_| \\_|",
			"",
			"Convert a Geometry Dash level's data to a readable JSON format.",
			"",
			"Format: leveltojson (options)",
			"",
			"Options:",
			"--------------------------------------------------------------------------------",
			"Local",
			"--file (-f): The full path to a level text file.",
			"--------------------------------------------------------------------------------",
			"Online",
			"--id (-i): The ID of the level you are getting the data of.",
			"--server (-s): The optional endpoint to a Geometry Dash server. (With http://)",
			"--------------------------------------------------------------------------------"
		].join("\n"));
	}

	if ((options.file && options.id) || (options.file && options.server))
		return console.log("You cannot have local and online options at the same time.");

	let data;
	try {
		data = options.id ? convert(await getLevelFromID(options.id, options.server ? options.server : "http://www.boomlings.com/database")) : convert(fs.readFileSync(path.resolve(options.file)).toString());
	} catch {
		return console.log("An error occured while retrieving level data.");
	}

	if (data == "-1")
		return console.log("An error occured while retrieving level data.");

	if (data == "-2")
		return console.log("You are being rate limited.");

	fs.writeFileSync(path.resolve(process.cwd(), "level.json"), JSON.stringify(data, null, "\t"));
	console.log("Data written to " + path.resolve(process.cwd(), "level.json") + ".");
}

module.exports = cli;