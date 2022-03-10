import path from "path";
import fs from "fs";

const filename = path.join(process.cwd(), ".health");

export const createHealthProbe = () => {
	fs.writeFileSync(filename, JSON.stringify(new Date()), "utf8");
};

export const removeHealthProbe = () => {
	try {
		fs.unlinkSync(filename);
	} catch (err) {}
};

export const hasHealthProbe = () => {
	try {
		return !!fs.lstatSync(filename);
	} catch (err) {
		return false;
	}
};
