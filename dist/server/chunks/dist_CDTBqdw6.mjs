import { i as __require, o as __toESM, t as __commonJSMin } from "./rolldown-runtime_BMI-E3GI.mjs";
import { createRequire } from "node:module";
import path from "node:path";
import stream from "node:stream";
import { availableParallelism } from "node:os";
import util from "node:util";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import events from "node:events";
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/is.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
/**
* Is this value defined and not null?
* @private
*/
var defined = (val) => typeof val !== "undefined" && val !== null;
/**
* Is this value an object?
* @private
*/
var object = (val) => typeof val === "object";
/**
* Is this value a plain object?
* @private
*/
var plainObject = (val) => Object.prototype.toString.call(val) === "[object Object]";
/**
* Is this value a function?
* @private
*/
var fn = (val) => typeof val === "function";
/**
* Is this value a boolean?
* @private
*/
var bool$1 = (val) => typeof val === "boolean";
/**
* Is this value a Buffer object?
* @private
*/
var buffer = (val) => val instanceof Buffer;
/**
* Is this value a typed array object?. E.g. Uint8Array or Uint8ClampedArray?
* @private
*/
var typedArray = (val) => {
	if (defined(val)) switch (val.constructor) {
		case Uint8Array:
		case Uint8ClampedArray:
		case Int8Array:
		case Uint16Array:
		case Int16Array:
		case Uint32Array:
		case Int32Array:
		case Float32Array:
		case Float64Array: return true;
	}
	return false;
};
/**
* Is this value an ArrayBuffer object?
* @private
*/
var arrayBuffer = (val) => val instanceof ArrayBuffer;
/**
* Is this value a non-empty string?
* @private
*/
var string = (val) => typeof val === "string" && val.length > 0;
/**
* Is this value a real number?
* @private
*/
var number = (val) => typeof val === "number" && Number.isFinite(val);
/**
* Is this value an integer?
* @private
*/
var integer = (val) => Number.isInteger(val);
/**
* Is this value within an inclusive given range?
* @private
*/
var inRange = (val, min, max) => val >= min && val <= max;
/**
* Is this value within the elements of an array?
* @private
*/
var inArray = (val, list) => list.includes(val);
/**
* Create an Error with a message relating to an invalid parameter.
*
* @param {string} name - parameter name.
* @param {string} expected - description of the type/value/range expected.
* @param {*} actual - the value received.
* @returns {Error} Containing the formatted message.
* @private
*/
var invalidParameterError = (name, expected, actual) => /* @__PURE__ */ new Error(`Expected ${expected} for ${name} but received ${actual} of type ${typeof actual}`);
/**
* Ensures an Error from C++ contains a JS stack.
*
* @param {Error} native - Error with message from C++.
* @param {Error} context - Error with stack from JS.
* @returns {Error} Error with message and stack.
* @private
*/
var nativeError = (native, context) => {
	context.message = native.message;
	return context;
};
var is_default = {
	defined,
	object,
	plainObject,
	fn,
	bool: bool$1,
	buffer,
	typedArray,
	arrayBuffer,
	string,
	number,
	integer,
	inRange,
	inArray,
	invalidParameterError,
	nativeError
};
//#endregion
//#region node_modules/.pnpm/detect-libc@2.1.2/node_modules/detect-libc/lib/process.js
var require_process = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isLinux = () => process.platform === "linux";
	var report = null;
	var getReport = () => {
		if (!report)
 /* istanbul ignore next */
		if (isLinux() && process.report) {
			const orig = process.report.excludeNetwork;
			process.report.excludeNetwork = true;
			report = process.report.getReport();
			process.report.excludeNetwork = orig;
		} else report = {};
		return report;
	};
	module.exports = {
		isLinux,
		getReport
	};
}));
//#endregion
//#region node_modules/.pnpm/detect-libc@2.1.2/node_modules/detect-libc/lib/filesystem.js
var require_filesystem = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs = __require("fs");
	var LDD_PATH = "/usr/bin/ldd";
	var SELF_PATH = "/proc/self/exe";
	var MAX_LENGTH = 2048;
	/**
	* Read the content of a file synchronous
	*
	* @param {string} path
	* @returns {Buffer}
	*/
	var readFileSync = (path) => {
		const fd = fs.openSync(path, "r");
		const buffer = Buffer.alloc(MAX_LENGTH);
		const bytesRead = fs.readSync(fd, buffer, 0, MAX_LENGTH, 0);
		fs.close(fd, () => {});
		return buffer.subarray(0, bytesRead);
	};
	/**
	* Read the content of a file
	*
	* @param {string} path
	* @returns {Promise<Buffer>}
	*/
	var readFile = (path) => new Promise((resolve, reject) => {
		fs.open(path, "r", (err, fd) => {
			if (err) reject(err);
			else {
				const buffer = Buffer.alloc(MAX_LENGTH);
				fs.read(fd, buffer, 0, MAX_LENGTH, 0, (_, bytesRead) => {
					resolve(buffer.subarray(0, bytesRead));
					fs.close(fd, () => {});
				});
			}
		});
	});
	module.exports = {
		LDD_PATH,
		SELF_PATH,
		readFileSync,
		readFile
	};
}));
//#endregion
//#region node_modules/.pnpm/detect-libc@2.1.2/node_modules/detect-libc/lib/elf.js
var require_elf = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var interpreterPath = (elf) => {
		if (elf.length < 64) return null;
		if (elf.readUInt32BE(0) !== 2135247942) return null;
		if (elf.readUInt8(4) !== 2) return null;
		if (elf.readUInt8(5) !== 1) return null;
		const offset = elf.readUInt32LE(32);
		const size = elf.readUInt16LE(54);
		const count = elf.readUInt16LE(56);
		for (let i = 0; i < count; i++) {
			const headerOffset = offset + i * size;
			if (elf.readUInt32LE(headerOffset) === 3) {
				const fileOffset = elf.readUInt32LE(headerOffset + 8);
				const fileSize = elf.readUInt32LE(headerOffset + 32);
				return elf.subarray(fileOffset, fileOffset + fileSize).toString().replace(/\0.*$/g, "");
			}
		}
		return null;
	};
	module.exports = { interpreterPath };
}));
//#endregion
//#region node_modules/.pnpm/detect-libc@2.1.2/node_modules/detect-libc/lib/detect-libc.js
var require_detect_libc = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var childProcess = __require("child_process");
	var { isLinux, getReport } = require_process();
	var { LDD_PATH, SELF_PATH, readFile, readFileSync } = require_filesystem();
	var { interpreterPath } = require_elf();
	var cachedFamilyInterpreter;
	var cachedFamilyFilesystem;
	var cachedVersionFilesystem;
	var command = "getconf GNU_LIBC_VERSION 2>&1 || true; ldd --version 2>&1 || true";
	var commandOut = "";
	var safeCommand = () => {
		if (!commandOut) return new Promise((resolve) => {
			childProcess.exec(command, (err, out) => {
				commandOut = err ? " " : out;
				resolve(commandOut);
			});
		});
		return commandOut;
	};
	var safeCommandSync = () => {
		if (!commandOut) try {
			commandOut = childProcess.execSync(command, { encoding: "utf8" });
		} catch (_err) {
			commandOut = " ";
		}
		return commandOut;
	};
	/**
	* A String constant containing the value `glibc`.
	* @type {string}
	* @public
	*/
	var GLIBC = "glibc";
	/**
	* A Regexp constant to get the GLIBC Version.
	* @type {string}
	*/
	var RE_GLIBC_VERSION = /LIBC[a-z0-9 \-).]*?(\d+\.\d+)/i;
	/**
	* A String constant containing the value `musl`.
	* @type {string}
	* @public
	*/
	var MUSL = "musl";
	var isFileMusl = (f) => f.includes("libc.musl-") || f.includes("ld-musl-");
	var familyFromReport = () => {
		const report = getReport();
		if (report.header && report.header.glibcVersionRuntime) return GLIBC;
		if (Array.isArray(report.sharedObjects)) {
			if (report.sharedObjects.some(isFileMusl)) return MUSL;
		}
		return null;
	};
	var familyFromCommand = (out) => {
		const [getconf, ldd1] = out.split(/[\r\n]+/);
		if (getconf && getconf.includes(GLIBC)) return GLIBC;
		if (ldd1 && ldd1.includes(MUSL)) return MUSL;
		return null;
	};
	var familyFromInterpreterPath = (path) => {
		if (path) {
			if (path.includes("/ld-musl-")) return MUSL;
			else if (path.includes("/ld-linux-")) return GLIBC;
		}
		return null;
	};
	var getFamilyFromLddContent = (content) => {
		content = content.toString();
		if (content.includes("musl")) return MUSL;
		if (content.includes("GNU C Library")) return GLIBC;
		return null;
	};
	var familyFromFilesystem = async () => {
		if (cachedFamilyFilesystem !== void 0) return cachedFamilyFilesystem;
		cachedFamilyFilesystem = null;
		try {
			cachedFamilyFilesystem = getFamilyFromLddContent(await readFile(LDD_PATH));
		} catch (e) {}
		return cachedFamilyFilesystem;
	};
	var familyFromFilesystemSync = () => {
		if (cachedFamilyFilesystem !== void 0) return cachedFamilyFilesystem;
		cachedFamilyFilesystem = null;
		try {
			cachedFamilyFilesystem = getFamilyFromLddContent(readFileSync(LDD_PATH));
		} catch (e) {}
		return cachedFamilyFilesystem;
	};
	var familyFromInterpreter = async () => {
		if (cachedFamilyInterpreter !== void 0) return cachedFamilyInterpreter;
		cachedFamilyInterpreter = null;
		try {
			cachedFamilyInterpreter = familyFromInterpreterPath(interpreterPath(await readFile(SELF_PATH)));
		} catch (e) {}
		return cachedFamilyInterpreter;
	};
	var familyFromInterpreterSync = () => {
		if (cachedFamilyInterpreter !== void 0) return cachedFamilyInterpreter;
		cachedFamilyInterpreter = null;
		try {
			cachedFamilyInterpreter = familyFromInterpreterPath(interpreterPath(readFileSync(SELF_PATH)));
		} catch (e) {}
		return cachedFamilyInterpreter;
	};
	/**
	* Resolves with the libc family when it can be determined, `null` otherwise.
	* @returns {Promise<?string>}
	*/
	var family = async () => {
		let family = null;
		if (isLinux()) {
			family = await familyFromInterpreter();
			if (!family) {
				family = await familyFromFilesystem();
				if (!family) family = familyFromReport();
				if (!family) family = familyFromCommand(await safeCommand());
			}
		}
		return family;
	};
	/**
	* Returns the libc family when it can be determined, `null` otherwise.
	* @returns {?string}
	*/
	var familySync = () => {
		let family = null;
		if (isLinux()) {
			family = familyFromInterpreterSync();
			if (!family) {
				family = familyFromFilesystemSync();
				if (!family) family = familyFromReport();
				if (!family) family = familyFromCommand(safeCommandSync());
			}
		}
		return family;
	};
	/**
	* Resolves `true` only when the platform is Linux and the libc family is not `glibc`.
	* @returns {Promise<boolean>}
	*/
	var isNonGlibcLinux = async () => isLinux() && await family() !== GLIBC;
	/**
	* Returns `true` only when the platform is Linux and the libc family is not `glibc`.
	* @returns {boolean}
	*/
	var isNonGlibcLinuxSync = () => isLinux() && familySync() !== GLIBC;
	var versionFromFilesystem = async () => {
		if (cachedVersionFilesystem !== void 0) return cachedVersionFilesystem;
		cachedVersionFilesystem = null;
		try {
			const versionMatch = (await readFile(LDD_PATH)).match(RE_GLIBC_VERSION);
			if (versionMatch) cachedVersionFilesystem = versionMatch[1];
		} catch (e) {}
		return cachedVersionFilesystem;
	};
	var versionFromFilesystemSync = () => {
		if (cachedVersionFilesystem !== void 0) return cachedVersionFilesystem;
		cachedVersionFilesystem = null;
		try {
			const versionMatch = readFileSync(LDD_PATH).match(RE_GLIBC_VERSION);
			if (versionMatch) cachedVersionFilesystem = versionMatch[1];
		} catch (e) {}
		return cachedVersionFilesystem;
	};
	var versionFromReport = () => {
		const report = getReport();
		if (report.header && report.header.glibcVersionRuntime) return report.header.glibcVersionRuntime;
		return null;
	};
	var versionSuffix = (s) => s.trim().split(/\s+/)[1];
	var versionFromCommand = (out) => {
		const [getconf, ldd1, ldd2] = out.split(/[\r\n]+/);
		if (getconf && getconf.includes(GLIBC)) return versionSuffix(getconf);
		if (ldd1 && ldd2 && ldd1.includes(MUSL)) return versionSuffix(ldd2);
		return null;
	};
	/**
	* Resolves with the libc version when it can be determined, `null` otherwise.
	* @returns {Promise<?string>}
	*/
	var version = async () => {
		let version = null;
		if (isLinux()) {
			version = await versionFromFilesystem();
			if (!version) version = versionFromReport();
			if (!version) version = versionFromCommand(await safeCommand());
		}
		return version;
	};
	/**
	* Returns the libc version when it can be determined, `null` otherwise.
	* @returns {?string}
	*/
	var versionSync = () => {
		let version = null;
		if (isLinux()) {
			version = versionFromFilesystemSync();
			if (!version) version = versionFromReport();
			if (!version) version = versionFromCommand(safeCommandSync());
		}
		return version;
	};
	module.exports = {
		GLIBC,
		MUSL,
		family,
		familySync,
		isNonGlibcLinux,
		isNonGlibcLinuxSync,
		version,
		versionSync
	};
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		MAX_LENGTH: 256,
		MAX_SAFE_COMPONENT_LENGTH: 16,
		MAX_SAFE_BUILD_LENGTH: 250,
		MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER || 
		/* istanbul ignore next */ 9007199254740991,
		RELEASE_TYPES: [
			"major",
			"premajor",
			"minor",
			"preminor",
			"patch",
			"prepatch",
			"prerelease"
		],
		SEMVER_SPEC_VERSION: "2.0.0",
		FLAG_INCLUDE_PRERELEASE: 1,
		FLAG_LOOSE: 2
	};
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/debug.js
var require_debug = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {};
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/re.js
var require_re = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH, MAX_LENGTH } = require_constants();
	var debug = require_debug();
	exports = module.exports = {};
	var re = exports.re = [];
	var safeRe = exports.safeRe = [];
	var src = exports.src = [];
	var safeSrc = exports.safeSrc = [];
	var t = exports.t = {};
	var R = 0;
	var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
	var safeRegexReplacements = [
		["\\s", 1],
		["\\d", MAX_LENGTH],
		[LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
	];
	var makeSafeRegex = (value) => {
		for (const [token, max] of safeRegexReplacements) value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
		return value;
	};
	var createToken = (name, value, isGlobal) => {
		const safe = makeSafeRegex(value);
		const index = R++;
		debug(name, index, value);
		t[name] = index;
		src[index] = value;
		safeSrc[index] = safe;
		re[index] = new RegExp(value, isGlobal ? "g" : void 0);
		safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
	};
	createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
	createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
	createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
	createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
	createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
	createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
	createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
	createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
	createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
	createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
	createToken("FULL", `^${src[t.FULLPLAIN]}$`);
	createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
	createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
	createToken("GTLT", "((?:<|>)?=?)");
	createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
	createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
	createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
	createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COERCEPLAIN", `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
	createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
	createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
	createToken("COERCERTL", src[t.COERCE], true);
	createToken("COERCERTLFULL", src[t.COERCEFULL], true);
	createToken("LONETILDE", "(?:~>?)");
	createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
	exports.tildeTrimReplace = "$1~";
	createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
	createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("LONECARET", "(?:\\^)");
	createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
	exports.caretTrimReplace = "$1^";
	createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
	createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
	createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
	createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
	exports.comparatorTrimReplace = "$1$2$3";
	createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
	createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
	createToken("STAR", "(<|>)?=?\\s*\\*");
	createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
	createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/parse-options.js
var require_parse_options = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var looseOption = Object.freeze({ loose: true });
	var emptyOpts = Object.freeze({});
	var parseOptions = (options) => {
		if (!options) return emptyOpts;
		if (typeof options !== "object") return looseOption;
		return options;
	};
	module.exports = parseOptions;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/identifiers.js
var require_identifiers = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var numeric = /^[0-9]+$/;
	var compareIdentifiers = (a, b) => {
		if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
		const anum = numeric.test(a);
		const bnum = numeric.test(b);
		if (anum && bnum) {
			a = +a;
			b = +b;
		}
		return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
	};
	var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
	module.exports = {
		compareIdentifiers,
		rcompareIdentifiers
	};
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/semver.js
var require_semver$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var debug = require_debug();
	var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
	var { safeRe: re, t } = require_re();
	var parseOptions = require_parse_options();
	var { compareIdentifiers } = require_identifiers();
	var isPrereleaseIdentifier = (prerelease, identifier) => {
		const identifiers = identifier.split(".");
		if (identifiers.length > prerelease.length) return false;
		for (let i = 0; i < identifiers.length; i++) if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) return false;
		return true;
	};
	module.exports = class SemVer {
		constructor(version, options) {
			options = parseOptions(options);
			if (version instanceof SemVer) if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) return version;
			else version = version.version;
			else if (typeof version !== "string") throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
			if (version.length > MAX_LENGTH) throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
			debug("SemVer", version, options);
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
			if (!m) throw new TypeError(`Invalid Version: ${version}`);
			this.raw = version;
			this.major = +m[1];
			this.minor = +m[2];
			this.patch = +m[3];
			if (this.major > MAX_SAFE_INTEGER || this.major < 0) throw new TypeError("Invalid major version");
			if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) throw new TypeError("Invalid minor version");
			if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) throw new TypeError("Invalid patch version");
			if (!m[4]) this.prerelease = [];
			else this.prerelease = m[4].split(".").map((id) => {
				if (/^[0-9]+$/.test(id)) {
					const num = +id;
					if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
				}
				return id;
			});
			this.build = m[5] ? m[5].split(".") : [];
			this.format();
		}
		format() {
			this.version = `${this.major}.${this.minor}.${this.patch}`;
			if (this.prerelease.length) this.version += `-${this.prerelease.join(".")}`;
			return this.version;
		}
		toString() {
			return this.version;
		}
		compare(other) {
			debug("SemVer.compare", this.version, this.options, other);
			if (!(other instanceof SemVer)) {
				if (typeof other === "string" && other === this.version) return 0;
				other = new SemVer(other, this.options);
			}
			if (other.version === this.version) return 0;
			return this.compareMain(other) || this.comparePre(other);
		}
		compareMain(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.major < other.major) return -1;
			if (this.major > other.major) return 1;
			if (this.minor < other.minor) return -1;
			if (this.minor > other.minor) return 1;
			if (this.patch < other.patch) return -1;
			if (this.patch > other.patch) return 1;
			return 0;
		}
		comparePre(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.prerelease.length && !other.prerelease.length) return -1;
			else if (!this.prerelease.length && other.prerelease.length) return 1;
			else if (!this.prerelease.length && !other.prerelease.length) return 0;
			let i = 0;
			do {
				const a = this.prerelease[i];
				const b = other.prerelease[i];
				debug("prerelease compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		compareBuild(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			let i = 0;
			do {
				const a = this.build[i];
				const b = other.build[i];
				debug("build compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		inc(release, identifier, identifierBase) {
			if (release.startsWith("pre")) {
				if (!identifier && identifierBase === false) throw new Error("invalid increment argument: identifier is empty");
				if (identifier) {
					const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
					if (!match || match[1] !== identifier) throw new Error(`invalid identifier: ${identifier}`);
				}
			}
			switch (release) {
				case "premajor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor = 0;
					this.major++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "preminor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "prepatch":
					this.prerelease.length = 0;
					this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "prerelease":
					if (this.prerelease.length === 0) this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "release":
					if (this.prerelease.length === 0) throw new Error(`version ${this.raw} is not a prerelease`);
					this.prerelease.length = 0;
					break;
				case "major":
					if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
					this.minor = 0;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "minor":
					if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "patch":
					if (this.prerelease.length === 0) this.patch++;
					this.prerelease = [];
					break;
				case "pre": {
					const base = Number(identifierBase) ? 1 : 0;
					if (this.prerelease.length === 0) this.prerelease = [base];
					else {
						let i = this.prerelease.length;
						while (--i >= 0) if (typeof this.prerelease[i] === "number") {
							this.prerelease[i]++;
							i = -2;
						}
						if (i === -1) {
							if (identifier === this.prerelease.join(".") && identifierBase === false) throw new Error("invalid increment argument: identifier already exists");
							this.prerelease.push(base);
						}
					}
					if (identifier) {
						let prerelease = [identifier, base];
						if (identifierBase === false) prerelease = [identifier];
						if (isPrereleaseIdentifier(this.prerelease, identifier)) {
							const prereleaseBase = this.prerelease[identifier.split(".").length];
							if (isNaN(prereleaseBase)) this.prerelease = prerelease;
						} else this.prerelease = prerelease;
					}
					break;
				}
				default: throw new Error(`invalid increment argument: ${release}`);
			}
			this.raw = this.format();
			if (this.build.length) this.raw += `+${this.build.join(".")}`;
			return this;
		}
	};
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var parse = (version, options, throwErrors = false) => {
		if (version instanceof SemVer) return version;
		try {
			return new SemVer(version, options);
		} catch (er) {
			if (!throwErrors) return null;
			throw er;
		}
	};
	module.exports = parse;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/valid.js
var require_valid$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var valid = (version, options) => {
		const v = parse(version, options);
		return v ? v.version : null;
	};
	module.exports = valid;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/clean.js
var require_clean = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var clean = (version, options) => {
		const s = parse(version.trim().replace(/^[=v]+/, ""), options);
		return s ? s.version : null;
	};
	module.exports = clean;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/inc.js
var require_inc = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var inc = (version, release, options, identifier, identifierBase) => {
		if (typeof options === "string") {
			identifierBase = identifier;
			identifier = options;
			options = void 0;
		}
		try {
			return new SemVer(version instanceof SemVer ? version.version : version, options).inc(release, identifier, identifierBase).version;
		} catch (er) {
			return null;
		}
	};
	module.exports = inc;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/diff.js
var require_diff = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var diff = (version1, version2) => {
		const v1 = parse(version1, null, true);
		const v2 = parse(version2, null, true);
		const comparison = v1.compare(v2);
		if (comparison === 0) return null;
		const v1Higher = comparison > 0;
		const highVersion = v1Higher ? v1 : v2;
		const lowVersion = v1Higher ? v2 : v1;
		const highHasPre = !!highVersion.prerelease.length;
		if (!!lowVersion.prerelease.length && !highHasPre) {
			if (!lowVersion.patch && !lowVersion.minor) return "major";
			if (lowVersion.compareMain(highVersion) === 0) {
				if (lowVersion.minor && !lowVersion.patch) return "minor";
				return "patch";
			}
		}
		const prefix = highHasPre ? "pre" : "";
		if (v1.major !== v2.major) return prefix + "major";
		if (v1.minor !== v2.minor) return prefix + "minor";
		if (v1.patch !== v2.patch) return prefix + "patch";
		return "prerelease";
	};
	module.exports = diff;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/major.js
var require_major = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var major = (a, loose) => new SemVer(a, loose).major;
	module.exports = major;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/minor.js
var require_minor = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var minor = (a, loose) => new SemVer(a, loose).minor;
	module.exports = minor;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/patch.js
var require_patch = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var patch = (a, loose) => new SemVer(a, loose).patch;
	module.exports = patch;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/prerelease.js
var require_prerelease = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var prerelease = (version, options) => {
		const parsed = parse(version, options);
		return parsed && parsed.prerelease.length ? parsed.prerelease : null;
	};
	module.exports = prerelease;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/compare.js
var require_compare = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
	module.exports = compare;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/rcompare.js
var require_rcompare = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var rcompare = (a, b, loose) => compare(b, a, loose);
	module.exports = rcompare;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/compare-loose.js
var require_compare_loose = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var compareLoose = (a, b) => compare(a, b, true);
	module.exports = compareLoose;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/compare-build.js
var require_compare_build = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var compareBuild = (a, b, loose) => {
		const versionA = new SemVer(a, loose);
		const versionB = new SemVer(b, loose);
		return versionA.compare(versionB) || versionA.compareBuild(versionB);
	};
	module.exports = compareBuild;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/sort.js
var require_sort = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compareBuild = require_compare_build();
	var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
	module.exports = sort;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/rsort.js
var require_rsort = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compareBuild = require_compare_build();
	var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
	module.exports = rsort;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/gt.js
var require_gt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gt = (a, b, loose) => compare(a, b, loose) > 0;
	module.exports = gt;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/lt.js
var require_lt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lt = (a, b, loose) => compare(a, b, loose) < 0;
	module.exports = lt;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/eq.js
var require_eq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var eq = (a, b, loose) => compare(a, b, loose) === 0;
	module.exports = eq;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/neq.js
var require_neq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var neq = (a, b, loose) => compare(a, b, loose) !== 0;
	module.exports = neq;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/gte.js
var require_gte = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gte = (a, b, loose) => compare(a, b, loose) >= 0;
	module.exports = gte;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/lte.js
var require_lte = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lte = (a, b, loose) => compare(a, b, loose) <= 0;
	module.exports = lte;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/cmp.js
var require_cmp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var eq = require_eq();
	var neq = require_neq();
	var gt = require_gt();
	var gte = require_gte();
	var lt = require_lt();
	var lte = require_lte();
	var cmp = (a, op, b, loose) => {
		switch (op) {
			case "===":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a === b;
			case "!==":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a !== b;
			case "":
			case "=":
			case "==": return eq(a, b, loose);
			case "!=": return neq(a, b, loose);
			case ">": return gt(a, b, loose);
			case ">=": return gte(a, b, loose);
			case "<": return lt(a, b, loose);
			case "<=": return lte(a, b, loose);
			default: throw new TypeError(`Invalid operator: ${op}`);
		}
	};
	module.exports = cmp;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/coerce.js
var require_coerce = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var parse = require_parse();
	var { safeRe: re, t } = require_re();
	var coerce = (version, options) => {
		if (version instanceof SemVer) return version;
		if (typeof version === "number") version = String(version);
		if (typeof version !== "string") return null;
		options = options || {};
		let match = null;
		if (!options.rtl) match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
		else {
			const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
			let next;
			while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
				if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
				coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
			}
			coerceRtlRegex.lastIndex = -1;
		}
		if (match === null) return null;
		const major = match[2];
		return parse(`${major}.${match[3] || "0"}.${match[4] || "0"}${options.includePrerelease && match[5] ? `-${match[5]}` : ""}${options.includePrerelease && match[6] ? `+${match[6]}` : ""}`, options);
	};
	module.exports = coerce;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/truncate.js
var require_truncate = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var constants = require_constants();
	var SemVer = require_semver$1();
	var truncate = (version, truncation, options) => {
		if (!constants.RELEASE_TYPES.includes(truncation)) return null;
		const clonedVersion = cloneInputVersion(version, options);
		return clonedVersion && doTruncation(clonedVersion, truncation);
	};
	var cloneInputVersion = (version, options) => {
		return parse(version instanceof SemVer ? version.version : version, options);
	};
	var doTruncation = (version, truncation) => {
		if (isPrerelease(truncation)) return version.version;
		version.prerelease = [];
		switch (truncation) {
			case "major":
				version.minor = 0;
				version.patch = 0;
				break;
			case "minor": version.patch = 0;
		}
		return version.format();
	};
	var isPrerelease = (type) => {
		return type.startsWith("pre");
	};
	module.exports = truncate;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/lrucache.js
var require_lrucache = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var LRUCache = class {
		constructor() {
			this.max = 1e3;
			this.map = /* @__PURE__ */ new Map();
		}
		get(key) {
			const value = this.map.get(key);
			if (value === void 0) return;
			else {
				this.map.delete(key);
				this.map.set(key, value);
				return value;
			}
		}
		delete(key) {
			return this.map.delete(key);
		}
		set(key, value) {
			if (!this.delete(key) && value !== void 0) {
				if (this.map.size >= this.max) {
					const firstKey = this.map.keys().next().value;
					this.delete(firstKey);
				}
				this.map.set(key, value);
			}
			return this;
		}
	};
	module.exports = LRUCache;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/range.js
var require_range = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SPACE_CHARACTERS = /\s+/g;
	module.exports = class Range {
		constructor(range, options) {
			options = parseOptions(options);
			if (range instanceof Range) if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) return range;
			else return new Range(range.raw, options);
			if (range instanceof Comparator) {
				this.raw = range.value;
				this.set = [[range]];
				this.formatted = void 0;
				return this;
			}
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
			this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
			if (!this.set.length) throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
			if (this.set.length > 1) {
				const first = this.set[0];
				this.set = this.set.filter((c) => !isNullSet(c[0]));
				if (this.set.length === 0) this.set = [first];
				else if (this.set.length > 1) {
					for (const c of this.set) if (c.length === 1 && isAny(c[0])) {
						this.set = [c];
						break;
					}
				}
			}
			this.formatted = void 0;
		}
		get range() {
			if (this.formatted === void 0) {
				this.formatted = "";
				for (let i = 0; i < this.set.length; i++) {
					if (i > 0) this.formatted += "||";
					const comps = this.set[i];
					for (let k = 0; k < comps.length; k++) {
						if (k > 0) this.formatted += " ";
						this.formatted += comps[k].toString().trim();
					}
				}
			}
			return this.formatted;
		}
		format() {
			return this.range;
		}
		toString() {
			return this.range;
		}
		parseRange(range) {
			range = range.replace(BUILDSTRIPRE, "");
			const memoKey = ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE)) + ":" + range;
			const cached = cache.get(memoKey);
			if (cached) return cached;
			const loose = this.options.loose;
			const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
			range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
			debug("hyphen replace", range);
			range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
			debug("comparator trim", range);
			range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
			debug("tilde trim", range);
			range = range.replace(re[t.CARETTRIM], caretTrimReplace);
			debug("caret trim", range);
			let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
			if (loose) rangeList = rangeList.filter((comp) => {
				debug("loose invalid filter", comp, this.options);
				return !!comp.match(re[t.COMPARATORLOOSE]);
			});
			debug("range list", rangeList);
			const rangeMap = /* @__PURE__ */ new Map();
			const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
			for (const comp of comparators) {
				if (isNullSet(comp)) return [comp];
				rangeMap.set(comp.value, comp);
			}
			if (rangeMap.size > 1 && rangeMap.has("")) rangeMap.delete("");
			const result = [...rangeMap.values()];
			cache.set(memoKey, result);
			return result;
		}
		intersects(range, options) {
			if (!(range instanceof Range)) throw new TypeError("a Range is required");
			return this.set.some((thisComparators) => {
				return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
					return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
						return rangeComparators.every((rangeComparator) => {
							return thisComparator.intersects(rangeComparator, options);
						});
					});
				});
			});
		}
		test(version) {
			if (!version) return false;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			for (let i = 0; i < this.set.length; i++) if (testSet(this.set[i], version, this.options)) return true;
			return false;
		}
	};
	var cache = new (require_lrucache())();
	var parseOptions = require_parse_options();
	var Comparator = require_comparator();
	var debug = require_debug();
	var SemVer = require_semver$1();
	var { safeRe: re, src, t, comparatorTrimReplace, tildeTrimReplace, caretTrimReplace } = require_re();
	var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
	var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
	var isNullSet = (c) => c.value === "<0.0.0-0";
	var isAny = (c) => c.value === "";
	var isSatisfiable = (comparators, options) => {
		let result = true;
		const remainingComparators = comparators.slice();
		let testComparator = remainingComparators.pop();
		while (result && remainingComparators.length) {
			result = remainingComparators.every((otherComparator) => {
				return testComparator.intersects(otherComparator, options);
			});
			testComparator = remainingComparators.pop();
		}
		return result;
	};
	var parseComparator = (comp, options) => {
		comp = comp.replace(re[t.BUILD], "");
		debug("comp", comp, options);
		comp = replaceCarets(comp, options);
		debug("caret", comp);
		comp = replaceTildes(comp, options);
		debug("tildes", comp);
		comp = replaceXRanges(comp, options);
		debug("xrange", comp);
		comp = replaceStars(comp, options);
		debug("stars", comp);
		return comp;
	};
	var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
	var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
	var replaceTildes = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
	};
	var replaceTilde = (comp, options) => {
		const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
		const z = options.includePrerelease ? "-0" : "";
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("tilde", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
			else if (isX(p)) ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
			else if (pr) {
				debug("replaceTilde pr", pr);
				ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
			} else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
			debug("tilde return", ret);
			return ret;
		});
	};
	var replaceCarets = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
	};
	var replaceCaret = (comp, options) => {
		debug("caret", comp, options);
		const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
		const z = options.includePrerelease ? "-0" : "";
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("caret", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
			else if (isX(p)) if (M === "0") ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
			else ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
			else if (pr) {
				debug("replaceCaret pr", pr);
				if (M === "0") if (m === "0") ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
				else ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
				else ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
			} else {
				debug("no pr");
				if (M === "0") if (m === "0") ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
				else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
				else ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
			}
			debug("caret return", ret);
			return ret;
		});
	};
	var replaceXRanges = (comp, options) => {
		debug("replaceXRanges", comp, options);
		return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
	};
	var replaceXRange = (comp, options) => {
		comp = comp.trim();
		const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
		return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
			debug("xRange", comp, ret, gtlt, M, m, p, pr);
			if (invalidXRangeOrder(M, m, p)) return comp;
			const xM = isX(M);
			const xm = xM || isX(m);
			const xp = xm || isX(p);
			const anyX = xp;
			if (gtlt === "=" && anyX) gtlt = "";
			pr = options.includePrerelease ? "-0" : "";
			if (xM) if (gtlt === ">" || gtlt === "<") ret = "<0.0.0-0";
			else ret = "*";
			else if (gtlt && anyX) {
				if (xm) m = 0;
				p = 0;
				if (gtlt === ">") {
					gtlt = ">=";
					if (xm) {
						M = +M + 1;
						m = 0;
						p = 0;
					} else {
						m = +m + 1;
						p = 0;
					}
				} else if (gtlt === "<=") {
					gtlt = "<";
					if (xm) M = +M + 1;
					else m = +m + 1;
				}
				if (gtlt === "<") pr = "-0";
				ret = `${gtlt + M}.${m}.${p}${pr}`;
			} else if (xm) ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
			else if (xp) ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
			debug("xRange return", ret);
			return ret;
		});
	};
	var replaceStars = (comp, options) => {
		debug("replaceStars", comp, options);
		return comp.trim().replace(re[t.STAR], "");
	};
	var replaceGTE0 = (comp, options) => {
		debug("replaceGTE0", comp, options);
		return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
	};
	var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
		if (isX(fM)) from = "";
		else if (isX(fm)) from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
		else if (isX(fp)) from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
		else if (fpr) from = `>=${from}`;
		else from = `>=${from}${incPr ? "-0" : ""}`;
		if (isX(tM)) to = "";
		else if (isX(tm)) to = `<${+tM + 1}.0.0-0`;
		else if (isX(tp)) to = `<${tM}.${+tm + 1}.0-0`;
		else if (tpr) to = `<=${tM}.${tm}.${tp}-${tpr}`;
		else if (incPr) to = `<${tM}.${tm}.${+tp + 1}-0`;
		else to = `<=${to}`;
		return `${from} ${to}`.trim();
	};
	var testSet = (set, version, options) => {
		for (let i = 0; i < set.length; i++) if (!set[i].test(version)) return false;
		if (version.prerelease.length && !options.includePrerelease) {
			for (let i = 0; i < set.length; i++) {
				debug(set[i].semver);
				if (set[i].semver === Comparator.ANY) continue;
				if (set[i].semver.prerelease.length > 0) {
					const allowed = set[i].semver;
					if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) return true;
				}
			}
			return false;
		}
		return true;
	};
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/comparator.js
var require_comparator = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ANY = Symbol("SemVer ANY");
	module.exports = class Comparator {
		static get ANY() {
			return ANY;
		}
		constructor(comp, options) {
			options = parseOptions(options);
			if (comp instanceof Comparator) if (comp.loose === !!options.loose) return comp;
			else comp = comp.value;
			comp = comp.trim().split(/\s+/).join(" ");
			debug("comparator", comp, options);
			this.options = options;
			this.loose = !!options.loose;
			this.parse(comp);
			if (this.semver === ANY) this.value = "";
			else this.value = this.operator + this.semver.version;
			debug("comp", this);
		}
		parse(comp) {
			const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
			const m = comp.match(r);
			if (!m) throw new TypeError(`Invalid comparator: ${comp}`);
			this.operator = m[1] !== void 0 ? m[1] : "";
			if (this.operator === "=") this.operator = "";
			if (!m[2]) this.semver = ANY;
			else this.semver = new SemVer(m[2], this.options.loose);
		}
		toString() {
			return this.value;
		}
		test(version) {
			debug("Comparator.test", version, this.options.loose);
			if (this.semver === ANY || version === ANY) return true;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			return cmp(version, this.operator, this.semver, this.options);
		}
		intersects(comp, options) {
			if (!(comp instanceof Comparator)) throw new TypeError("a Comparator is required");
			if (this.operator === "") {
				if (this.value === "") return true;
				return new Range(comp.value, options).test(this.value);
			} else if (comp.operator === "") {
				if (comp.value === "") return true;
				return new Range(this.value, options).test(comp.semver);
			}
			options = parseOptions(options);
			if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) return false;
			if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) return false;
			if (this.operator.startsWith(">") && comp.operator.startsWith(">")) return true;
			if (this.operator.startsWith("<") && comp.operator.startsWith("<")) return true;
			if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) return true;
			if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) return true;
			if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) return true;
			return false;
		}
	};
	var parseOptions = require_parse_options();
	var { safeRe: re, t } = require_re();
	var cmp = require_cmp();
	var debug = require_debug();
	var SemVer = require_semver$1();
	var Range = require_range();
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/satisfies.js
var require_satisfies = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var satisfies = (version, range, options) => {
		try {
			range = new Range(range, options);
		} catch (er) {
			return false;
		}
		return range.test(version);
	};
	module.exports = satisfies;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/to-comparators.js
var require_to_comparators = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
	module.exports = toComparators;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Range = require_range();
	var maxSatisfying = (versions, range, options) => {
		let max = null;
		let maxSV = null;
		let rangeObj = null;
		try {
			rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach((v) => {
			if (rangeObj.test(v)) {
				if (!max || maxSV.compare(v) === -1) {
					max = v;
					maxSV = new SemVer(max, options);
				}
			}
		});
		return max;
	};
	module.exports = maxSatisfying;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Range = require_range();
	var minSatisfying = (versions, range, options) => {
		let min = null;
		let minSV = null;
		let rangeObj = null;
		try {
			rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach((v) => {
			if (rangeObj.test(v)) {
				if (!min || minSV.compare(v) === 1) {
					min = v;
					minSV = new SemVer(min, options);
				}
			}
		});
		return min;
	};
	module.exports = minSatisfying;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/min-version.js
var require_min_version = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Range = require_range();
	var gt = require_gt();
	var minVersion = (range, loose) => {
		range = new Range(range, loose);
		let minver = new SemVer("0.0.0");
		if (range.test(minver)) return minver;
		minver = new SemVer("0.0.0-0");
		if (range.test(minver)) return minver;
		minver = null;
		for (let i = 0; i < range.set.length; ++i) {
			const comparators = range.set[i];
			let setMin = null;
			comparators.forEach((comparator) => {
				const compver = new SemVer(comparator.semver.version);
				switch (comparator.operator) {
					case ">":
						if (compver.prerelease.length === 0) compver.patch++;
						else compver.prerelease.push(0);
						compver.raw = compver.format();
					case "":
					case ">=":
						if (!setMin || gt(compver, setMin)) setMin = compver;
						break;
					case "<":
					case "<=": break;
					/* istanbul ignore next */
					default: throw new Error(`Unexpected operation: ${comparator.operator}`);
				}
			});
			if (setMin && (!minver || gt(minver, setMin))) minver = setMin;
		}
		if (minver && range.test(minver)) return minver;
		return null;
	};
	module.exports = minVersion;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/valid.js
var require_valid = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var validRange = (range, options) => {
		try {
			return new Range(range, options).range || "*";
		} catch (er) {
			return null;
		}
	};
	module.exports = validRange;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/outside.js
var require_outside = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Comparator = require_comparator();
	var { ANY } = Comparator;
	var Range = require_range();
	var satisfies = require_satisfies();
	var gt = require_gt();
	var lt = require_lt();
	var lte = require_lte();
	var gte = require_gte();
	var outside = (version, range, hilo, options) => {
		version = new SemVer(version, options);
		range = new Range(range, options);
		let gtfn, ltefn, ltfn, comp, ecomp;
		switch (hilo) {
			case ">":
				gtfn = gt;
				ltefn = lte;
				ltfn = lt;
				comp = ">";
				ecomp = ">=";
				break;
			case "<":
				gtfn = lt;
				ltefn = gte;
				ltfn = gt;
				comp = "<";
				ecomp = "<=";
				break;
			default: throw new TypeError("Must provide a hilo val of \"<\" or \">\"");
		}
		if (satisfies(version, range, options)) return false;
		for (let i = 0; i < range.set.length; ++i) {
			const comparators = range.set[i];
			let high = null;
			let low = null;
			comparators.forEach((comparator) => {
				if (comparator.semver === ANY) comparator = new Comparator(">=0.0.0");
				high = high || comparator;
				low = low || comparator;
				if (gtfn(comparator.semver, high.semver, options)) high = comparator;
				else if (ltfn(comparator.semver, low.semver, options)) low = comparator;
			});
			if (high.operator === comp || high.operator === ecomp) return false;
			if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) return false;
			else if (low.operator === ecomp && ltfn(version, low.semver)) return false;
		}
		return true;
	};
	module.exports = outside;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/gtr.js
var require_gtr = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var outside = require_outside();
	var gtr = (version, range, options) => outside(version, range, ">", options);
	module.exports = gtr;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/ltr.js
var require_ltr = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var outside = require_outside();
	var ltr = (version, range, options) => outside(version, range, "<", options);
	module.exports = ltr;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/intersects.js
var require_intersects = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var intersects = (r1, r2, options) => {
		r1 = new Range(r1, options);
		r2 = new Range(r2, options);
		return r1.intersects(r2, options);
	};
	module.exports = intersects;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/simplify.js
var require_simplify = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var satisfies = require_satisfies();
	var compare = require_compare();
	module.exports = (versions, range, options) => {
		const set = [];
		let first = null;
		let prev = null;
		const v = versions.sort((a, b) => compare(a, b, options));
		for (const version of v) if (satisfies(version, range, options)) {
			prev = version;
			if (!first) first = version;
		} else {
			if (prev) set.push([first, prev]);
			prev = null;
			first = null;
		}
		if (first) set.push([first, null]);
		const ranges = [];
		for (const [min, max] of set) if (min === max) ranges.push(min);
		else if (!max && min === v[0]) ranges.push("*");
		else if (!max) ranges.push(`>=${min}`);
		else if (min === v[0]) ranges.push(`<=${max}`);
		else ranges.push(`${min} - ${max}`);
		const simplified = ranges.join(" || ");
		const original = typeof range.raw === "string" ? range.raw : String(range);
		return simplified.length < original.length ? simplified : range;
	};
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/subset.js
var require_subset = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var Comparator = require_comparator();
	var { ANY } = Comparator;
	var satisfies = require_satisfies();
	var compare = require_compare();
	var subset = (sub, dom, options = {}) => {
		if (sub === dom) return true;
		sub = new Range(sub, options);
		dom = new Range(dom, options);
		let sawNonNull = false;
		OUTER: for (const simpleSub of sub.set) {
			for (const simpleDom of dom.set) {
				const isSub = simpleSubset(simpleSub, simpleDom, options);
				sawNonNull = sawNonNull || isSub !== null;
				if (isSub) continue OUTER;
			}
			if (sawNonNull) return false;
		}
		return true;
	};
	var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
	var minimumVersion = [new Comparator(">=0.0.0")];
	var simpleSubset = (sub, dom, options) => {
		if (sub === dom) return true;
		if (sub.length === 1 && sub[0].semver === ANY) if (dom.length === 1 && dom[0].semver === ANY) return true;
		else if (options.includePrerelease) sub = minimumVersionWithPreRelease;
		else sub = minimumVersion;
		if (dom.length === 1 && dom[0].semver === ANY) if (options.includePrerelease) return true;
		else dom = minimumVersion;
		const eqSet = /* @__PURE__ */ new Set();
		let gt, lt;
		for (const c of sub) if (c.operator === ">" || c.operator === ">=") gt = higherGT(gt, c, options);
		else if (c.operator === "<" || c.operator === "<=") lt = lowerLT(lt, c, options);
		else eqSet.add(c.semver);
		if (eqSet.size > 1) return null;
		let gtltComp;
		if (gt && lt) {
			gtltComp = compare(gt.semver, lt.semver, options);
			if (gtltComp > 0) return null;
			else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) return null;
		}
		for (const eq of eqSet) {
			if (gt && !satisfies(eq, String(gt), options)) return null;
			if (lt && !satisfies(eq, String(lt), options)) return null;
			for (const c of dom) if (!satisfies(eq, String(c), options)) return false;
			return true;
		}
		let higher, lower;
		let hasDomLT, hasDomGT;
		let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
		let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
		if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) needDomLTPre = false;
		for (const c of dom) {
			hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
			hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
			if (gt) {
				if (needDomGTPre) {
					if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) needDomGTPre = false;
				}
				if (c.operator === ">" || c.operator === ">=") {
					higher = higherGT(gt, c, options);
					if (higher === c && higher !== gt) return false;
				} else if (gt.operator === ">=" && !c.test(gt.semver)) return false;
			}
			if (lt) {
				if (needDomLTPre) {
					if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) needDomLTPre = false;
				}
				if (c.operator === "<" || c.operator === "<=") {
					lower = lowerLT(lt, c, options);
					if (lower === c && lower !== lt) return false;
				} else if (lt.operator === "<=" && !c.test(lt.semver)) return false;
			}
			if (!c.operator && (lt || gt) && gtltComp !== 0) return false;
		}
		if (gt && hasDomLT && !lt && gtltComp !== 0) return false;
		if (lt && hasDomGT && !gt && gtltComp !== 0) return false;
		if (needDomGTPre || needDomLTPre) return false;
		return true;
	};
	var higherGT = (a, b, options) => {
		if (!a) return b;
		const comp = compare(a.semver, b.semver, options);
		return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
	};
	var lowerLT = (a, b, options) => {
		if (!a) return b;
		const comp = compare(a.semver, b.semver, options);
		return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
	};
	module.exports = subset;
}));
//#endregion
//#region node_modules/.pnpm/semver@7.8.5/node_modules/semver/index.js
var require_semver = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var internalRe = require_re();
	var constants = require_constants();
	var SemVer = require_semver$1();
	var identifiers = require_identifiers();
	module.exports = {
		parse: require_parse(),
		valid: require_valid$1(),
		clean: require_clean(),
		inc: require_inc(),
		diff: require_diff(),
		major: require_major(),
		minor: require_minor(),
		patch: require_patch(),
		prerelease: require_prerelease(),
		compare: require_compare(),
		rcompare: require_rcompare(),
		compareLoose: require_compare_loose(),
		compareBuild: require_compare_build(),
		sort: require_sort(),
		rsort: require_rsort(),
		gt: require_gt(),
		lt: require_lt(),
		eq: require_eq(),
		neq: require_neq(),
		gte: require_gte(),
		lte: require_lte(),
		cmp: require_cmp(),
		coerce: require_coerce(),
		truncate: require_truncate(),
		Comparator: require_comparator(),
		Range: require_range(),
		satisfies: require_satisfies(),
		toComparators: require_to_comparators(),
		maxSatisfying: require_max_satisfying(),
		minSatisfying: require_min_satisfying(),
		minVersion: require_min_version(),
		validRange: require_valid(),
		outside: require_outside(),
		gtr: require_gtr(),
		ltr: require_ltr(),
		intersects: require_intersects(),
		simplifyRange: require_simplify(),
		subset: require_subset(),
		SemVer,
		re: internalRe.re,
		src: internalRe.src,
		tokens: internalRe.t,
		SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
		RELEASE_TYPES: constants.RELEASE_TYPES,
		compareIdentifiers: identifiers.compareIdentifiers,
		rcompareIdentifiers: identifiers.rcompareIdentifiers
	};
}));
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/package.json
var import_detect_libc = /* @__PURE__ */ __toESM(require_detect_libc(), 1);
var import_semver = /* @__PURE__ */ __toESM(require_semver(), 1);
var package_default = {
	name: "sharp",
	description: "High performance Node.js image processing, the fastest module to resize JPEG, PNG, WebP, GIF, AVIF and TIFF images",
	version: "0.35.3",
	author: "Lovell Fuller <npm@lovell.info>",
	homepage: "https://sharp.pixelplumbing.com",
	contributors: [
		"Pierre Inglebert <pierre.inglebert@gmail.com>",
		"Jonathan Ong <jonathanrichardong@gmail.com>",
		"Chanon Sajjamanochai <chanon.s@gmail.com>",
		"Juliano Julio <julianojulio@gmail.com>",
		"Daniel Gasienica <daniel@gasienica.ch>",
		"Julian Walker <julian@fiftythree.com>",
		"Amit Pitaru <pitaru.amit@gmail.com>",
		"Brandon Aaron <hello.brandon@aaron.sh>",
		"Andreas Lind <andreas@one.com>",
		"Maurus Cuelenaere <mcuelenaere@gmail.com>",
		"Linus Unnebäck <linus@folkdatorn.se>",
		"Victor Mateevitsi <mvictoras@gmail.com>",
		"Alaric Holloway <alaric.holloway@gmail.com>",
		"Bernhard K. Weisshuhn <bkw@codingforce.com>",
		"Chris Riley <criley@primedia.com>",
		"David Carley <dacarley@gmail.com>",
		"John Tobin <john@limelightmobileinc.com>",
		"Kenton Gray <kentongray@gmail.com>",
		"Felix Bünemann <Felix.Buenemann@gmail.com>",
		"Samy Al Zahrani <samyalzahrany@gmail.com>",
		"Chintan Thakkar <lemnisk8@gmail.com>",
		"F. Orlando Galashan <frulo@gmx.de>",
		"Kleis Auke Wolthuizen <info@kleisauke.nl>",
		"Matt Hirsch <mhirsch@media.mit.edu>",
		"Matthias Thoemmes <thoemmes@gmail.com>",
		"Patrick Paskaris <patrick@paskaris.gr>",
		"Jérémy Lal <kapouer@melix.org>",
		"Rahul Nanwani <r.nanwani@gmail.com>",
		"Alice Monday <alice0meta@gmail.com>",
		"Kristo Jorgenson <kristo.jorgenson@gmail.com>",
		"YvesBos <yves_bos@outlook.com>",
		"Guy Maliar <guy@tailorbrands.com>",
		"Nicolas Coden <nicolas@ncoden.fr>",
		"Matt Parrish <matt.r.parrish@gmail.com>",
		"Marcel Bretschneider <marcel.bretschneider@gmail.com>",
		"Matthew McEachen <matthew+github@mceachen.org>",
		"Jarda Kotěšovec <jarda.kotesovec@gmail.com>",
		"Kenric D'Souza <kenric.dsouza@gmail.com>",
		"Oleh Aleinyk <oleg.aleynik@gmail.com>",
		"Marcel Bretschneider <marcel.bretschneider@gmail.com>",
		"Andrea Bianco <andrea.bianco@unibas.ch>",
		"Rik Heywood <rik@rik.org>",
		"Thomas Parisot <hi@oncletom.io>",
		"Nathan Graves <nathanrgraves+github@gmail.com>",
		"Tom Lokhorst <tom@lokhorst.eu>",
		"Espen Hovlandsdal <espen@hovlandsdal.com>",
		"Sylvain Dumont <sylvain.dumont35@gmail.com>",
		"Alun Davies <alun.owain.davies@googlemail.com>",
		"Aidan Hoolachan <ajhoolachan21@gmail.com>",
		"Axel Eirola <axel.eirola@iki.fi>",
		"Freezy <freezy@xbmc.org>",
		"Daiz <taneli.vatanen@gmail.com>",
		"Julian Aubourg <j@ubourg.net>",
		"Keith Belovay <keith@picthrive.com>",
		"Michael B. Klein <mbklein@gmail.com>",
		"Jordan Prudhomme <jordan@raboland.fr>",
		"Ilya Ovdin <iovdin@gmail.com>",
		"Andargor <andargor@yahoo.com>",
		"Paul Neave <paul.neave@gmail.com>",
		"Brendan Kennedy <brenwken@gmail.com>",
		"Brychan Bennett-Odlum <git@brychan.io>",
		"Edward Silverton <e.silverton@gmail.com>",
		"Roman Malieiev <aromaleev@gmail.com>",
		"Tomas Szabo <tomas.szabo@deftomat.com>",
		"Robert O'Rourke <robert@o-rourke.org>",
		"Guillermo Alfonso Varela Chouciño <guillevch@gmail.com>",
		"Christian Flintrup <chr@gigahost.dk>",
		"Manan Jadhav <manan@motionden.com>",
		"Leon Radley <leon@radley.se>",
		"alza54 <alza54@thiocod.in>",
		"Jacob Smith <jacob@frende.me>",
		"Michael Nutt <michael@nutt.im>",
		"Brad Parham <baparham@gmail.com>",
		"Taneli Vatanen <taneli.vatanen@gmail.com>",
		"Joris Dugué <zaruike10@gmail.com>",
		"Chris Banks <christopher.bradley.banks@gmail.com>",
		"Ompal Singh <ompal.hitm09@gmail.com>",
		"Brodan <christopher.hranj@gmail.com>",
		"Ankur Parihar <ankur.github@gmail.com>",
		"Brahim Ait elhaj <brahima@gmail.com>",
		"Mart Jansink <m.jansink@gmail.com>",
		"Lachlan Newman <lachnewman007@gmail.com>",
		"Dennis Beatty <dennis@dcbeatty.com>",
		"Ingvar Stepanyan <me@rreverser.com>",
		"Don Denton <don@happycollision.com>",
		"Dmytro Tiapukhin <cool.gegeg@gmail.com>",
		"Florian Lefebvre <contact@florian-lefebvre.dev>"
	],
	scripts: {
		"build": "node install/build.js",
		"build:dist": "node scripts/build.mjs",
		"clean": "rm -rf src/build/ test/fixtures/output.*",
		"test": "npm run lint && npm run test-unit",
		"lint": "npm run lint-cpp && npm run lint-js && npm run lint-types && npm run lint-publish",
		"lint-cpp": "cpplint --quiet src/*.h src/*.cc",
		"lint-js": "biome lint",
		"lint-publish": "publint --strict",
		"lint-types": "tsd --files ./test/types/sharp.test-d.{cts,mts}",
		"test-leak": "./test/leak/leak.sh",
		"test-unit": "node --experimental-test-coverage test/unit.mjs",
		"package-from-local-build": "node npm/from-local-build.js",
		"package-wasm-wrappers": "node npm/wasm-wrappers.js",
		"package-release-notes": "node npm/release-notes.js",
		"docs-build": "node docs/build.mjs",
		"docs-serve": "cd docs && npm start",
		"docs-publish": "cd docs && npm run build && npx firebase-tools deploy --project pixelplumbing --only hosting:pixelplumbing-sharp"
	},
	type: "commonjs",
	files: [
		"dist",
		"install",
		"lib/index.d.ts",
		"src/*.{cc,h,gyp}"
	],
	main: "./dist/index.cjs",
	module: "./dist/index.mjs",
	types: "./dist/index.d.mts",
	exports: { ".": {
		"import": {
			"types": "./dist/index.d.mts",
			"default": "./dist/index.mjs"
		},
		"require": {
			"types": "./dist/index.d.cts",
			"default": "./dist/index.cjs"
		}
	} },
	sideEffects: true,
	repository: {
		"type": "git",
		"url": "git+https://github.com/lovell/sharp.git"
	},
	keywords: [
		"jpeg",
		"png",
		"webp",
		"avif",
		"tiff",
		"gif",
		"svg",
		"jp2",
		"dzi",
		"image",
		"resize",
		"thumbnail",
		"crop",
		"embed",
		"libvips",
		"vips"
	],
	dependencies: {
		"@img/colour": "^1.1.0",
		"detect-libc": "^2.1.2",
		"semver": "^7.8.5"
	},
	optionalDependencies: {
		"@img/sharp-darwin-arm64": "0.35.3",
		"@img/sharp-darwin-x64": "0.35.3",
		"@img/sharp-freebsd-wasm32": "0.35.3",
		"@img/sharp-libvips-darwin-arm64": "1.3.2",
		"@img/sharp-libvips-darwin-x64": "1.3.2",
		"@img/sharp-libvips-linux-arm": "1.3.2",
		"@img/sharp-libvips-linux-arm64": "1.3.2",
		"@img/sharp-libvips-linux-ppc64": "1.3.2",
		"@img/sharp-libvips-linux-riscv64": "1.3.2",
		"@img/sharp-libvips-linux-s390x": "1.3.2",
		"@img/sharp-libvips-linux-x64": "1.3.2",
		"@img/sharp-libvips-linuxmusl-arm64": "1.3.2",
		"@img/sharp-libvips-linuxmusl-x64": "1.3.2",
		"@img/sharp-linux-arm": "0.35.3",
		"@img/sharp-linux-arm64": "0.35.3",
		"@img/sharp-linux-ppc64": "0.35.3",
		"@img/sharp-linux-riscv64": "0.35.3",
		"@img/sharp-linux-s390x": "0.35.3",
		"@img/sharp-linux-x64": "0.35.3",
		"@img/sharp-linuxmusl-arm64": "0.35.3",
		"@img/sharp-linuxmusl-x64": "0.35.3",
		"@img/sharp-webcontainers-wasm32": "0.35.3",
		"@img/sharp-win32-arm64": "0.35.3",
		"@img/sharp-win32-ia32": "0.35.3",
		"@img/sharp-win32-x64": "0.35.3"
	},
	peerDependenciesMeta: { "@types/node": { "optional": true } },
	devDependencies: {
		"@biomejs/biome": "^2.5.1",
		"@cpplint/cli": "^0.1.0",
		"@emnapi/runtime": "^1.11.1",
		"@img/sharp-libvips-dev": "1.3.2",
		"@img/sharp-libvips-dev-wasm32": "1.3.2",
		"@img/sharp-libvips-win32-arm64": "1.3.2",
		"@img/sharp-libvips-win32-ia32": "1.3.2",
		"@img/sharp-libvips-win32-x64": "1.3.2",
		"@types/node": "*",
		"emnapi": "^1.11.1",
		"exif-reader": "^2.0.3",
		"extract-zip": "^2.0.1",
		"icc": "^4.0.0",
		"node-addon-api": "^8.9.0",
		"node-gyp": "^12.4.0",
		"publint": "^0.3.21",
		"tar-fs": "^3.1.3",
		"tsd": "^0.33.0"
	},
	license: "Apache-2.0",
	engines: { "node": ">=20.9.0" },
	config: { "libvips": ">=8.18.3" },
	funding: { "url": "https://opencollective.com/libvips" }
};
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/libvips.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
/* node:coverage ignore next */
var minimumLibvipsVersionLabelled = process.env.npm_package_config_libvips || package_default.config.libvips;
var minimumLibvipsVersion$1 = import_semver.default.coerce(minimumLibvipsVersionLabelled).version;
var prebuiltPlatforms$1 = [
	"darwin-arm64",
	"darwin-x64",
	"freebsd-arm64",
	"freebsd-x64",
	"linux-arm",
	"linux-arm64",
	"linux-ppc64",
	"linux-riscv64",
	"linux-s390x",
	"linux-wasm32",
	"linux-x64",
	"linuxmusl-arm64",
	"linuxmusl-x64",
	"win32-arm64",
	"win32-ia32",
	"win32-x64"
];
var spawnSyncOptions = {
	encoding: "utf8",
	shell: true
};
var log = (item) => {
	if (item instanceof Error) console.error(`sharp: Installation error: ${item.message}`);
	else console.log(`sharp: ${item}`);
};
/* node:coverage disable */
var runtimeLibc = () => import_detect_libc.default.isNonGlibcLinuxSync() ? import_detect_libc.default.familySync() : "";
var runtimePlatformArch$1 = () => `${process.platform}${runtimeLibc()}-${process.arch}`;
var buildPlatformArch = () => {
	if (isEmscripten()) return "wasm32";
	const { npm_config_arch, npm_config_platform, npm_config_libc } = process.env;
	const libc = typeof npm_config_libc === "string" ? npm_config_libc : runtimeLibc();
	return `${npm_config_platform || process.platform}${libc}-${npm_config_arch || process.arch}`;
};
var buildSharpLibvipsIncludeDir = () => {
	try {
		return __require(`@img/sharp-libvips-dev-${buildPlatformArch()}/include`);
	} catch {
		try {
			return __require("@img/sharp-libvips-dev/include");
		} catch {}
	}
	return "";
};
var buildSharpLibvipsCPlusPlusDir = () => {
	try {
		return __require("@img/sharp-libvips-dev/cplusplus");
	} catch {}
	return "";
};
var buildSharpLibvipsLibDir = () => {
	try {
		return __require(`@img/sharp-libvips-dev-${buildPlatformArch()}/lib`);
	} catch {
		try {
			return __require(`@img/sharp-libvips-${buildPlatformArch()}/lib`);
		} catch {}
	}
	return "";
};
var isUnsupportedNodeRuntime$1 = () => {
	if (process.release?.name === "node" && process.versions) {
		if (!import_semver.default.satisfies(process.versions.node, package_default.engines.node)) return {
			found: process.versions.node,
			expected: package_default.engines.node
		};
	}
};
var isEmscripten = () => {
	const { CC } = process.env;
	return Boolean(CC?.endsWith("/emcc"));
};
var isRosetta = () => {
	if (process.platform === "darwin" && process.arch === "x64") return (spawnSync("sysctl sysctl.proc_translated", spawnSyncOptions).stdout || "").trim() === "sysctl.proc_translated: 1";
	return false;
};
/* node:coverage enable */
var sha512 = (s) => createHash("sha512").update(s).digest("hex");
var yarnLocator = () => {
	try {
		const identHash = sha512(`imgsharp-libvips-${buildPlatformArch()}`);
		const npmVersion = import_semver.default.coerce(package_default.optionalDependencies[`@img/sharp-libvips-${buildPlatformArch()}`], { includePrerelease: true }).version;
		return sha512(`${identHash}npm:${npmVersion}`).slice(0, 10);
	} catch {}
	return "";
};
/* node:coverage disable */
var spawnRebuild = () => spawnSync(`node-gyp rebuild --directory=src ${isEmscripten() ? "--nodedir=emscripten" : ""}`, {
	...spawnSyncOptions,
	stdio: "inherit"
}).status;
var globalLibvipsVersion = () => {
	if (process.platform !== "win32") return (spawnSync("pkg-config --modversion vips-cpp", {
		...spawnSyncOptions,
		env: {
			...process.env,
			PKG_CONFIG_PATH: pkgConfigPath()
		}
	}).stdout || "").trim();
	else return "";
};
var getBrewPkgConfigPath = () => {
	try {
		const brewPrefix = (spawnSync("brew", ["--prefix"], { encoding: "utf8" }).stdout || "").trim();
		if (brewPrefix) return `${brewPrefix}/lib/pkgconfig`;
	} catch (_err) {}
};
var getPkgConfigPath = () => {
	try {
		const pkgConfigPath = (spawnSync("pkg-config", [
			"--variable",
			"pc_path",
			"pkg-config"
		], { encoding: "utf8" }).stdout || "").trim();
		if (pkgConfigPath) return pkgConfigPath;
	} catch (_err) {}
};
/* node:coverage enable */
var pkgConfigPath = () => {
	if (process.platform !== "win32") return [
		getBrewPkgConfigPath(),
		getPkgConfigPath(),
		process.env.PKG_CONFIG_PATH
	].filter(Boolean).join(":");
	else return "";
};
var skipSearch = (status, reason, logger) => {
	if (logger) logger(`Detected ${reason}, skipping search for globally-installed libvips`);
	return status;
};
var useGlobalLibvips = (logger) => {
	if (Boolean(process.env.SHARP_IGNORE_GLOBAL_LIBVIPS) === true) return skipSearch(false, "SHARP_IGNORE_GLOBAL_LIBVIPS", logger);
	if (Boolean(process.env.SHARP_FORCE_GLOBAL_LIBVIPS) === true) return skipSearch(true, "SHARP_FORCE_GLOBAL_LIBVIPS", logger);
	/* node:coverage ignore next 3 */
	if (isRosetta()) return skipSearch(false, "Rosetta", logger);
	const globalVipsVersion = globalLibvipsVersion();
	/* node:coverage ignore next */
	return !!globalVipsVersion && import_semver.default.gte(globalVipsVersion, minimumLibvipsVersion$1);
};
var libvips_default = {
	minimumLibvipsVersion: minimumLibvipsVersion$1,
	prebuiltPlatforms: prebuiltPlatforms$1,
	buildPlatformArch,
	buildSharpLibvipsIncludeDir,
	buildSharpLibvipsCPlusPlusDir,
	buildSharpLibvipsLibDir,
	isUnsupportedNodeRuntime: isUnsupportedNodeRuntime$1,
	runtimePlatformArch: runtimePlatformArch$1,
	log,
	yarnLocator,
	spawnRebuild,
	globalLibvipsVersion,
	pkgConfigPath,
	useGlobalLibvips
};
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/sharp.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
var require$2 = createRequire(import.meta.url);
var { version } = package_default;
var { runtimePlatformArch, isUnsupportedNodeRuntime, prebuiltPlatforms, minimumLibvipsVersion } = libvips_default;
var runtimePlatform$1 = runtimePlatformArch();
/* node:coverage disable */
var sharp;
var errors = [];
try {
	sharp = require$2(`../src/build/Release/sharp-${runtimePlatform$1}-${version}.node`);
} catch (err) {
	errors.push(err);
}
if (!sharp) try {
	sharp = require$2(`../src/build/Release/sharp-wasm32-${version}.node`);
} catch (err) {
	errors.push(err);
}
if (!sharp) try {
	switch (runtimePlatform$1) {
		case "darwin-arm64":
			sharp = require$2("@img/sharp-darwin-arm64/sharp.node");
			break;
		case "darwin-x64":
			sharp = require$2("@img/sharp-darwin-x64/sharp.node");
			break;
		case "linux-arm":
			sharp = require$2("@img/sharp-linux-arm/sharp.node");
			break;
		case "linux-arm64":
			sharp = require$2("@img/sharp-linux-arm64/sharp.node");
			break;
		case "linux-ppc64":
			sharp = require$2("@img/sharp-linux-ppc64/sharp.node");
			break;
		case "linux-riscv64":
			sharp = require$2("@img/sharp-linux-riscv64/sharp.node");
			break;
		case "linux-s390x":
			sharp = require$2("@img/sharp-linux-s390x/sharp.node");
			break;
		case "linux-x64":
			sharp = require$2("@img/sharp-linux-x64/sharp.node");
			break;
		case "linuxmusl-arm64":
			sharp = require$2("@img/sharp-linuxmusl-arm64/sharp.node");
			break;
		case "linuxmusl-x64":
			sharp = require$2("@img/sharp-linuxmusl-x64/sharp.node");
			break;
		case "win32-arm64":
			sharp = require$2("@img/sharp-win32-arm64/sharp.node");
			break;
		case "win32-ia32":
			sharp = require$2("@img/sharp-win32-ia32/sharp.node");
			break;
		case "win32-x64":
			sharp = require$2("@img/sharp-win32-x64/sharp.node");
			break;
		case "freebsd-arm64":
		case "freebsd-x64":
			sharp = require$2("@img/sharp-freebsd-wasm32/sharp.node");
			break;
		case "linux-wasm32": sharp = require$2("@img/sharp-webcontainers-wasm32/sharp.node");
	}
	if (sharp && ["linux-x64", "linuxmusl-x64"].includes(runtimePlatform$1) && !sharp._isUsingX64V2()) {
		const err = /* @__PURE__ */ new Error("Prebuilt binaries for Linux x64 require v2 microarchitecture");
		err.code = "Unsupported CPU";
		errors.push(err);
		sharp = null;
	}
	if (sharp && process.versions.electron && runtimePlatform$1.startsWith("linux")) process.emitWarning("Binaries provided by Electron for use on Linux may be incompatible with sharp - see https://sharp.pixelplumbing.com/install#electron-and-linux", { code: "SharpElectronLinux" });
} catch (err) {
	errors.push(err);
}
if (!sharp) try {
	sharp = require$2("@img/sharp-wasm32/sharp.node");
} catch (err) {
	errors.push(err);
}
if (!sharp) {
	const [isLinux, isMacOs, isWindows] = [
		"linux",
		"darwin",
		"win32"
	].map((os) => runtimePlatform$1.startsWith(os));
	const help = [`Could not load the "sharp" module using the ${runtimePlatform$1} runtime`];
	errors.forEach((err) => {
		if (!err.code.endsWith("MODULE_NOT_FOUND")) help.push(`${err.code}: ${err.message}`);
	});
	const messages = errors.map((err) => err.message).join(" ");
	help.push("Possible solutions:");
	if (isUnsupportedNodeRuntime()) {
		const { found, expected } = isUnsupportedNodeRuntime();
		help.push("- Please upgrade Node.js:", `    Found ${found}`, `    Requires ${expected}`);
	} else if (prebuiltPlatforms.includes(runtimePlatform$1)) {
		const [os, cpu] = runtimePlatform$1.split("-");
		const libc = os.endsWith("musl") ? " --libc=musl" : "";
		help.push("- Ensure optional dependencies can be installed:", "    npm install --include=optional sharp", "- Ensure your package manager supports multi-platform installation:", "    See https://sharp.pixelplumbing.com/install#cross-platform", "- Add platform-specific dependencies:", `    npm install --os=${os.replace("musl", "")}${libc} --cpu=${cpu} sharp`);
	} else help.push(`- Manually install libvips >= ${minimumLibvipsVersion}`, "    See https://sharp.pixelplumbing.com/install#building-from-source", "- Add WebAssembly-based dependencies:", "    npm install sharp @img/sharp-wasm32");
	if (isLinux && /(symbol not found|CXXABI_)/i.test(messages)) try {
		const { config } = require$2(`@img/sharp-libvips-${runtimePlatform$1}/package`);
		const libcFound = `${(0, import_detect_libc.familySync)()} ${(0, import_detect_libc.versionSync)()}`;
		const libcRequires = `${config.musl ? "musl" : "glibc"} ${config.musl || config.glibc}`;
		help.push("- Update your OS:", `    Found ${libcFound}`, `    Requires ${libcRequires}`);
	} catch (_errEngines) {}
	if (isLinux && /\/snap\/core[0-9]{2}/.test(messages)) help.push("- Remove the Node.js Snap, which does not support native modules", "    snap remove node");
	if (isMacOs && /Incompatible library version/.test(messages)) help.push("- Update Homebrew:", "    brew update && brew upgrade vips");
	if (errors.some((err) => err.code === "ERR_DLOPEN_DISABLED")) help.push("- Run Node.js without using the --no-addons flag");
	if (isWindows && /The specified procedure could not be found/.test(messages)) help.push("- Using the canvas package on Windows?", "    See https://sharp.pixelplumbing.com/install#canvas-and-windows", "- Check for outdated versions of sharp in the dependency tree:", "    npm ls sharp");
	help.push("- Consult the installation documentation:", "    See https://sharp.pixelplumbing.com/install");
	throw new Error(help.join("\n"));
}
var sharp_default = sharp;
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/constructor.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
var debuglog = util.debuglog("sharp");
var queueListener = (queueLength) => {
	Sharp.queue.emit("change", queueLength);
};
/**
* Constructor factory to create an instance of `sharp`, to which further methods are chained.
*
* JPEG, PNG, WebP, GIF, AVIF or TIFF format image data can be streamed out from this object.
* When using Stream based output, derived attributes are available from the `info` event.
*
* Non-critical problems encountered during processing are emitted as `warning` events.
*
* Implements the [stream.Duplex](http://nodejs.org/api/stream.html#stream_class_stream_duplex) class.
*
* When loading more than one page/frame of an animated image,
* these are combined as a vertically-stacked "toilet roll" image
* where the overall height is the `pageHeight` multiplied by the number of `pages`.
*
* @constructs Sharp
*
* @emits Sharp#info
* @emits Sharp#warning
*
* @example
* sharp('input.jpg')
*   .resize(300, 200)
*   .toFile('output.jpg', function(err) {
*     // output.jpg is a 300 pixels wide and 200 pixels high image
*     // containing a scaled and cropped version of input.jpg
*   });
*
* @example
* // Read image data from remote URL,
* // resize to 300 pixels wide,
* // emit an 'info' event with calculated dimensions
* // and finally write image data to writableStream
* const { body } = await fetch('https://...');
* const readableStream = Readable.fromWeb(body);
* const transformer = sharp()
*   .resize(300)
*   .on('info', ({ height }) => {
*     console.log(`Image height is ${height}`);
*   });
* readableStream.pipe(transformer).pipe(writableStream);
*
* @example
* // Web Streams API, requires Node.js >= 24.15.0
* import { Duplex } from 'node:stream';
*
* const { body } = await fetch('https://...');
* const transformer = Duplex.toWeb(
*   sharp().resize(300),
*   { readableType: 'bytes' }
* );
* body.pipeThrough(transformer).pipeTo(writable);
*
* @example
* // Create a blank 300x200 PNG image of semi-translucent red pixels
* sharp({
*   create: {
*     width: 300,
*     height: 200,
*     channels: 4,
*     background: { r: 255, g: 0, b: 0, alpha: 0.5 }
*   }
* })
* .png()
* .toBuffer()
* .then( ... );
*
* @example
* // Convert an animated GIF to an animated WebP
* await sharp('in.gif', { animated: true }).toFile('out.webp');
*
* @example
* // Read a raw array of pixels and save it to a png
* const input = Uint8Array.from([255, 255, 255, 0, 0, 0]); // or Uint8ClampedArray
* const image = sharp(input, {
*   // because the input does not contain its dimensions or how many channels it has
*   // we need to specify it in the constructor options
*   raw: {
*     width: 2,
*     height: 1,
*     channels: 3
*   }
* });
* await image.toFile('my-two-pixels.png');
*
* @example
* // Generate RGB Gaussian noise
* await sharp({
*   create: {
*     width: 300,
*     height: 200,
*     channels: 3,
*     noise: {
*       type: 'gaussian',
*       mean: 128,
*       sigma: 30
*     }
*  }
* }).toFile('noise.png');
*
* @example
* // Generate an image from text
* await sharp({
*   text: {
*     text: 'Hello, world!',
*     width: 400, // max width
*     height: 300 // max height
*   }
* }).toFile('text_bw.png');
*
* @example
* // Generate an rgba image from text using pango markup and font
* await sharp({
*   text: {
*     text: '<span foreground="red">Red!</span><span background="cyan">blue</span>',
*     font: 'sans',
*     rgba: true,
*     dpi: 300
*   }
* }).toFile('text_rgba.png');
*
* @example
* // Join four input images as a 2x2 grid with a 4 pixel gutter
* const data = await sharp(
*  [image1, image2, image3, image4],
*  { join: { across: 2, shim: 4 } }
* ).toBuffer();
*
* @example
* // Generate a two-frame animated image from emoji
* const images = ['😀', '😛'].map(text => ({
*   text: { text, width: 64, height: 64, channels: 4, rgba: true }
* }));
* await sharp(images, { join: { animated: true } }).toFile('out.gif');
*
* @param {(Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array|Float64Array|string|Array)} [input] - if present, can be
*  a Buffer / ArrayBuffer / Uint8Array / Uint8ClampedArray containing JPEG, PNG, WebP, AVIF, GIF, SVG or TIFF image data, or
*  a TypedArray containing raw pixel image data, or
*  a String containing the filesystem path to an JPEG, PNG, WebP, AVIF, GIF, SVG or TIFF image file.
*  An array of inputs can be provided, and these will be joined together.
*  JPEG, PNG, WebP, AVIF, GIF, SVG, TIFF or raw pixel image data can be streamed into the object when not present.
* @param {Object} [options] - if present, is an Object with optional attributes.
* @param {string} [options.failOn='warning'] - When to abort processing of invalid pixel data, one of (in order of sensitivity, least to most): 'none', 'truncated', 'error', 'warning'. Higher levels imply lower levels. Invalid metadata will always abort. Use the default 'warning' level with untrusted input.
* @param {number|boolean} [options.limitInputPixels=268402689] - Do not process input images where the number of pixels
*  (width x height) exceeds this limit. Assumes image dimensions contained in the input metadata can be trusted.
*  An integral Number of pixels, zero or false to remove limit, true to use default limit of 268402689 (0x3FFF x 0x3FFF).
* @param {number|boolean} [options.limitInputChannels=5] - Do not process input images where the number of channels exceeds this limit. Assumes image metadata can be trusted.
*  An integral Number of channels, zero or false to remove limit, true to use default limit of 5.
* @param {boolean} [options.unlimited=false] - Set this to `true` to remove safety features that help prevent memory exhaustion (JPEG, PNG, SVG, HEIF).
* @param {boolean} [options.autoOrient=false] - Set this to `true` to rotate/flip the image to match EXIF `Orientation`, if any.
* @param {boolean} [options.sequentialRead=true] - Set this to `false` to use random access rather than sequential read. Some operations will do this automatically.
* @param {number} [options.density=72] - The DPI at which to render SVG and PDF images, in the range 1 to 100000.
* @param {number} [options.ignoreIcc=false] - should the embedded ICC profile, if any, be ignored.
* @param {number} [options.pages=1] - Number of pages to extract for multi-page input (GIF, WebP, TIFF), use -1 for all pages.
* @param {number} [options.page=0] - Page number to start extracting from for multi-page input (GIF, WebP, TIFF), zero based.
* @param {boolean} [options.animated=false] - Set to `true` to read all frames/pages of an animated image (GIF, WebP, TIFF), equivalent of setting `pages` to `-1`.
* @param {Object} [options.raw] - describes raw pixel input image data. See `raw()` for pixel ordering.
* @param {number} [options.raw.width] - integral number of pixels wide.
* @param {number} [options.raw.height] - integral number of pixels high.
* @param {number} [options.raw.channels] - integral number of channels, between 1 and 4.
* @param {boolean} [options.raw.premultiplied] - specifies that the raw input has already been premultiplied, set to `true`
*  to avoid sharp premultiplying the image. (optional, default `false`)
* @param {number} [options.raw.pageHeight] - The pixel height of each page/frame for animated images, must be an integral factor of `raw.height`.
* @param {Object} [options.create] - describes a new image to be created.
* @param {number} [options.create.width] - integral number of pixels wide.
* @param {number} [options.create.height] - integral number of pixels high.
* @param {number} [options.create.channels] - integral number of channels, either 3 (RGB) or 4 (RGBA).
* @param {string|Object} [options.create.background] - parsed by the [color](https://www.npmjs.org/package/color) module to extract values for red, green, blue and alpha.
* @param {number} [options.create.pageHeight] - The pixel height of each page/frame for animated images, must be an integral factor of `create.height`.
* @param {Object} [options.create.noise] - describes a noise to be created.
* @param {string} [options.create.noise.type] - type of generated noise, currently only `gaussian` is supported.
* @param {number} [options.create.noise.mean=128] - Mean value of pixels in the generated noise.
* @param {number} [options.create.noise.sigma=30] - Standard deviation of pixel values in the generated noise.
* @param {Object} [options.text] - describes a new text image to be created.
* @param {string} [options.text.text] - text to render as a UTF-8 string. It can contain Pango markup, for example `<i>Le</i>Monde`.
* @param {string} [options.text.font] - font name to render with.
* @param {string} [options.text.fontfile] - absolute filesystem path to a font file that can be used by `font`.
* @param {number} [options.text.width=0] - Integral number of pixels to word-wrap at. Lines of text wider than this will be broken at word boundaries.
* @param {number} [options.text.height=0] - Maximum integral number of pixels high. When defined, `dpi` will be ignored and the text will automatically fit the pixel resolution defined by `width` and `height`. Will be ignored if `width` is not specified or set to 0.
* @param {string} [options.text.align='left'] - Alignment style for multi-line text (`'left'`, `'centre'`, `'center'`, `'right'`).
* @param {boolean} [options.text.justify=false] - set this to true to apply justification to the text.
* @param {number} [options.text.dpi=72] - the resolution (size) at which to render the text. Does not take effect if `height` is specified.
* @param {boolean} [options.text.rgba=false] - set this to true to enable RGBA output. This is useful for colour emoji rendering, or support for pango markup features like `<span foreground="red">Red!</span>`.
* @param {number} [options.text.spacing=0] - text line height in points. Will use the font line height if none is specified.
* @param {string} [options.text.wrap='word'] - word wrapping style when width is provided, one of: 'word', 'char', 'word-char' (prefer word, fallback to char) or 'none'.
* @param {Object} [options.join] - describes how an array of input images should be joined.
* @param {number} [options.join.across=1] - number of images to join horizontally.
* @param {boolean} [options.join.animated=false] - set this to `true` to join the images as an animated image.
* @param {number} [options.join.shim=0] - number of pixels to insert between joined images.
* @param {string|Object} [options.join.background] - parsed by the [color](https://www.npmjs.org/package/color) module to extract values for red, green, blue and alpha.
* @param {string} [options.join.halign='left'] - horizontal alignment style for images joined horizontally (`'left'`, `'centre'`, `'center'`, `'right'`).
* @param {string} [options.join.valign='top'] - vertical alignment style for images joined vertically (`'top'`, `'centre'`, `'center'`, `'bottom'`).
* @param {Object} [options.tiff] - Describes TIFF specific options.
* @param {number} [options.tiff.subifd=-1] - Sub Image File Directory to extract for OME-TIFF, defaults to main image.
* @param {Object} [options.svg] - Describes SVG specific options.
* @param {string} [options.svg.stylesheet] - Custom CSS for SVG input, applied with a User Origin during the CSS cascade.
* @param {boolean} [options.svg.highBitdepth=false] - Set to `true` to render SVG input at 32-bits per channel (128-bit) instead of 8-bits per channel (32-bit) RGBA.
* @param {Object} [options.pdf] - Describes PDF specific options. Requires the use of a globally-installed libvips compiled with support for PDFium, Poppler, ImageMagick or GraphicsMagick.
* @param {string|Object} [options.pdf.background] - Background colour to use when PDF is partially transparent. Parsed by the [color](https://www.npmjs.org/package/color) module to extract values for red, green, blue and alpha.
* @param {Object} [options.openSlide] - Describes OpenSlide specific options. Requires the use of a globally-installed libvips compiled with support for OpenSlide.
* @param {number} [options.openSlide.level=0] - Level to extract from a multi-level input, zero based.
* @param {Object} [options.jp2] - Describes JPEG 2000 specific options. Requires the use of a globally-installed libvips compiled with support for OpenJPEG.
* @param {boolean} [options.jp2.oneshot=false] - Set to `true` to decode tiled JPEG 2000 images in a single operation, improving compatibility.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
var Sharp = function(input, options) {
	if (arguments.length === 1 && !is_default.defined(input)) throw new Error("Invalid input");
	if (!(this instanceof Sharp)) return new Sharp(input, options);
	stream.Duplex.call(this);
	this.options = {
		topOffsetPre: -1,
		leftOffsetPre: -1,
		widthPre: -1,
		heightPre: -1,
		topOffsetPost: -1,
		leftOffsetPost: -1,
		widthPost: -1,
		heightPost: -1,
		width: -1,
		height: -1,
		canvas: "crop",
		position: 0,
		resizeBackground: [
			0,
			0,
			0,
			255
		],
		angle: 0,
		rotationAngle: 0,
		rotationBackground: [
			0,
			0,
			0,
			255
		],
		rotateBefore: false,
		orientBefore: false,
		flip: false,
		flop: false,
		extendTop: 0,
		extendBottom: 0,
		extendLeft: 0,
		extendRight: 0,
		extendBackground: [
			0,
			0,
			0,
			255
		],
		extendWith: "background",
		withoutEnlargement: false,
		withoutReduction: false,
		affineMatrix: [],
		affineBackground: [
			0,
			0,
			0,
			255
		],
		affineIdx: 0,
		affineIdy: 0,
		affineOdx: 0,
		affineOdy: 0,
		affineInterpolator: this.constructor.interpolators.bilinear,
		kernel: "lanczos3",
		fastShrinkOnLoad: true,
		tint: [
			-1,
			0,
			0,
			0
		],
		flatten: false,
		flattenBackground: [
			0,
			0,
			0
		],
		unflatten: false,
		negate: false,
		negateAlpha: true,
		medianSize: 0,
		blurSigma: 0,
		precision: "integer",
		minAmpl: .2,
		sharpenSigma: 0,
		sharpenM1: 1,
		sharpenM2: 2,
		sharpenX1: 2,
		sharpenY2: 10,
		sharpenY3: 20,
		threshold: 0,
		thresholdGrayscale: true,
		trimBackground: [],
		trimThreshold: -1,
		trimLineArt: false,
		trimMargin: 0,
		dilateWidth: 0,
		erodeWidth: 0,
		gamma: 0,
		gammaOut: 0,
		greyscale: false,
		normalise: false,
		normaliseLower: 1,
		normaliseUpper: 99,
		claheWidth: 0,
		claheHeight: 0,
		claheMaxSlope: 3,
		brightness: 1,
		saturation: 1,
		hue: 0,
		lightness: 0,
		booleanBufferIn: null,
		booleanFileIn: "",
		joinChannelIn: [],
		extractChannel: -1,
		removeAlpha: false,
		ensureAlpha: -1,
		colourspace: "srgb",
		colourspacePipeline: "last",
		composite: [],
		fileOut: "",
		formatOut: "input",
		streamOut: false,
		typedArrayOut: false,
		keepMetadata: 0,
		withMetadataOrientation: -1,
		withMetadataDensity: 0,
		withIccProfile: "",
		withExif: {},
		withExifMerge: true,
		withXmp: "",
		keepGainMap: false,
		withGainMap: false,
		resolveWithObject: false,
		loop: -1,
		delay: [],
		jpegQuality: 80,
		jpegProgressive: false,
		jpegChromaSubsampling: "4:2:0",
		jpegTrellisQuantisation: false,
		jpegOvershootDeringing: false,
		jpegOptimiseScans: false,
		jpegOptimiseCoding: true,
		jpegQuantisationTable: 0,
		pngProgressive: false,
		pngCompressionLevel: 6,
		pngAdaptiveFiltering: false,
		pngPalette: false,
		pngQuality: 100,
		pngEffort: 7,
		pngBitdepth: 8,
		pngDither: 1,
		jp2Quality: 80,
		jp2TileHeight: 512,
		jp2TileWidth: 512,
		jp2Lossless: false,
		jp2ChromaSubsampling: "4:4:4",
		webpQuality: 80,
		webpAlphaQuality: 100,
		webpLossless: false,
		webpNearLossless: false,
		webpSmartSubsample: false,
		webpSmartDeblock: false,
		webpPreset: "default",
		webpEffort: 4,
		webpMinSize: false,
		webpMixed: false,
		webpExact: false,
		gifBitdepth: 8,
		gifEffort: 7,
		gifDither: 1,
		gifInterFrameMaxError: 0,
		gifInterPaletteMaxError: 3,
		gifKeepDuplicateFrames: false,
		gifReuse: true,
		gifProgressive: false,
		tiffQuality: 80,
		tiffCompression: "jpeg",
		tiffBigtiff: false,
		tiffPredictor: "horizontal",
		tiffPyramid: false,
		tiffMiniswhite: false,
		tiffBitdepth: 0,
		tiffTile: false,
		tiffTileHeight: 256,
		tiffTileWidth: 256,
		tiffXres: 1,
		tiffYres: 1,
		tiffResolutionUnit: "inch",
		heifQuality: 50,
		heifLossless: false,
		heifCompression: "av1",
		heifEffort: 4,
		heifChromaSubsampling: "4:4:4",
		heifBitdepth: 8,
		heifTune: "auto",
		jxlDistance: 1,
		jxlDecodingTier: 0,
		jxlEffort: 7,
		jxlLossless: false,
		rawDepth: "uchar",
		tileSize: 256,
		tileOverlap: 0,
		tileContainer: "fs",
		tileLayout: "dz",
		tileFormat: "last",
		tileDepth: "last",
		tileAngle: 0,
		tileSkipBlanks: -1,
		tileBackground: [
			255,
			255,
			255,
			255
		],
		tileCentre: false,
		tileId: "https://example.com/iiif",
		tileBasename: "",
		timeoutSeconds: 0,
		linearA: [],
		linearB: [],
		pdfBackground: [
			255,
			255,
			255,
			255
		],
		debuglog: (warning) => {
			this.emit("warning", warning);
			debuglog(warning);
		},
		queueListener
	};
	this.options.input = this._createInputDescriptor(input, options, { allowStream: true });
	return this;
};
Object.setPrototypeOf(Sharp.prototype, stream.Duplex.prototype);
Object.setPrototypeOf(Sharp, stream.Duplex);
/**
* Take a "snapshot" of the Sharp instance, returning a new instance.
* Cloned instances inherit the input of their parent instance.
* This allows multiple output Streams and therefore multiple processing pipelines to share a single input Stream.
*
* @example
* // firstWritableStream receives auto-rotated, resized readableStream
* // secondWritableStream receives auto-rotated, extracted region of readableStream
*
* const pipeline = sharp().rotate();
* pipeline
*   .clone()
*   .resize(800, 600)
*   .pipe(firstWritableStream);
* pipeline
*   .clone()
*   .extract({ left: 20, top: 20, width: 100, height: 100 })
*   .pipe(secondWritableStream);
* readableStream.pipe(pipeline);
*
* @example
* // Create a pipeline that will download an image, resize it and format it to different files
* // Using Promises to know when the pipeline is complete
*
* const sharpStream = sharp();
*
* const promises = [];
* promises.push(
*   sharpStream
*     .clone()
*     .jpeg({ quality: 100 })
*     .toFile("originalFile.jpg")
* );
* promises.push(
*   sharpStream
*     .clone()
*     .resize({ width: 500 })
*     .jpeg({ quality: 80 })
*     .toFile("optimized-500.jpg")
* );
* promises.push(
*   sharpStream
*     .clone()
*     .resize({ width: 500 })
*     .webp({ quality: 80 })
*     .toFile("optimized-500.webp")
* );
*
* const res = await fetch("https://www.example.com/some-file.jpg")
* Readable.fromWeb(res.body).pipe(sharpStream);
* await Promise.all(promises);
*
* @returns {Sharp}
*/
function clone() {
	const clone = this.constructor.call();
	const { debuglog, queueListener, ...options } = this.options;
	clone.options = structuredClone(options);
	clone.options.debuglog = debuglog;
	clone.options.queueListener = queueListener;
	if (this._isStreamInput()) this.on("finish", () => {
		this._flattenBufferIn();
		clone.options.input.buffer = this.options.input.buffer;
		clone.emit("finish");
	});
	return clone;
}
Object.assign(Sharp.prototype, { clone });
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/input.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
/**
* Justification alignment
* @member
* @private
*/
var align = {
	left: "low",
	top: "low",
	low: "low",
	center: "centre",
	centre: "centre",
	right: "high",
	bottom: "high",
	high: "high"
};
var inputStreamParameters = [
	"failOn",
	"limitInputPixels",
	"limitInputChannels",
	"unlimited",
	"animated",
	"autoOrient",
	"density",
	"ignoreIcc",
	"page",
	"pages",
	"sequentialRead",
	"jp2",
	"openSlide",
	"pdf",
	"raw",
	"svg",
	"tiff",
	"openSlideLevel",
	"pdfBackground",
	"tiffSubifd"
];
/**
* Extract input options, if any, from an object.
* @private
*/
function _inputOptionsFromObject(obj) {
	const params = inputStreamParameters.filter((p) => is_default.defined(obj[p])).map((p) => [p, obj[p]]);
	return params.length ? Object.fromEntries(params) : void 0;
}
/**
* Create Object containing input and input-related options.
* @private
*/
function _createInputDescriptor(input, inputOptions, containerOptions) {
	const inputDescriptor = {
		autoOrient: false,
		failOn: "warning",
		limitInputPixels: 16383 ** 2,
		limitInputChannels: 5,
		ignoreIcc: false,
		unlimited: false,
		sequentialRead: true
	};
	if (is_default.string(input)) inputDescriptor.file = input;
	else if (is_default.buffer(input)) {
		if (input.length === 0) throw Error("Input Buffer is empty");
		inputDescriptor.buffer = input;
	} else if (is_default.arrayBuffer(input)) {
		if (input.byteLength === 0) throw Error("Input bit Array is empty");
		inputDescriptor.buffer = Buffer.from(input, 0, input.byteLength);
	} else if (is_default.typedArray(input)) {
		if (input.length === 0) throw Error("Input Bit Array is empty");
		inputDescriptor.buffer = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
	} else if (is_default.plainObject(input) && !is_default.defined(inputOptions)) {
		inputOptions = input;
		if (_inputOptionsFromObject(inputOptions)) inputDescriptor.buffer = [];
	} else if (!is_default.defined(input) && !is_default.defined(inputOptions) && is_default.object(containerOptions) && containerOptions.allowStream) inputDescriptor.buffer = [];
	else if (Array.isArray(input)) if (input.length > 1) if (!this.options.joining) {
		this.options.joining = true;
		this.options.join = input.map((i) => this._createInputDescriptor(i));
	} else throw new Error("Recursive join is unsupported");
	else throw new Error("Expected at least two images to join");
	else throw new Error(`Unsupported input '${input}' of type ${typeof input}${is_default.defined(inputOptions) ? ` when also providing options of type ${typeof inputOptions}` : ""}`);
	if (is_default.object(inputOptions)) {
		if (is_default.defined(inputOptions.failOn)) if (is_default.string(inputOptions.failOn) && is_default.inArray(inputOptions.failOn, [
			"none",
			"truncated",
			"error",
			"warning"
		])) inputDescriptor.failOn = inputOptions.failOn;
		else throw is_default.invalidParameterError("failOn", "one of: none, truncated, error, warning", inputOptions.failOn);
		if (is_default.defined(inputOptions.autoOrient)) if (is_default.bool(inputOptions.autoOrient)) inputDescriptor.autoOrient = inputOptions.autoOrient;
		else throw is_default.invalidParameterError("autoOrient", "boolean", inputOptions.autoOrient);
		if (is_default.defined(inputOptions.density)) if (is_default.number(inputOptions.density) && is_default.inRange(inputOptions.density, 1, 1e5)) inputDescriptor.density = inputOptions.density;
		else throw is_default.invalidParameterError("density", "number between 1 and 100000", inputOptions.density);
		if (is_default.defined(inputOptions.ignoreIcc)) if (is_default.bool(inputOptions.ignoreIcc)) inputDescriptor.ignoreIcc = inputOptions.ignoreIcc;
		else throw is_default.invalidParameterError("ignoreIcc", "boolean", inputOptions.ignoreIcc);
		if (is_default.defined(inputOptions.limitInputPixels)) if (is_default.bool(inputOptions.limitInputPixels)) inputDescriptor.limitInputPixels = inputOptions.limitInputPixels ? 16383 ** 2 : 0;
		else if (is_default.integer(inputOptions.limitInputPixels) && is_default.inRange(inputOptions.limitInputPixels, 0, Number.MAX_SAFE_INTEGER)) inputDescriptor.limitInputPixels = inputOptions.limitInputPixels;
		else throw is_default.invalidParameterError("limitInputPixels", "positive integer", inputOptions.limitInputPixels);
		if (is_default.defined(inputOptions.limitInputChannels)) if (is_default.bool(inputOptions.limitInputChannels)) inputDescriptor.limitInputChannels = inputOptions.limitInputChannels ? 5 : 0;
		else if (is_default.integer(inputOptions.limitInputChannels) && is_default.inRange(inputOptions.limitInputChannels, 0, Number.MAX_SAFE_INTEGER)) inputDescriptor.limitInputChannels = inputOptions.limitInputChannels;
		else throw is_default.invalidParameterError("limitInputChannels", "positive integer", inputOptions.limitInputChannels);
		if (is_default.defined(inputOptions.unlimited)) if (is_default.bool(inputOptions.unlimited)) inputDescriptor.unlimited = inputOptions.unlimited;
		else throw is_default.invalidParameterError("unlimited", "boolean", inputOptions.unlimited);
		if (is_default.defined(inputOptions.sequentialRead)) if (is_default.bool(inputOptions.sequentialRead)) inputDescriptor.sequentialRead = inputOptions.sequentialRead;
		else throw is_default.invalidParameterError("sequentialRead", "boolean", inputOptions.sequentialRead);
		if (is_default.defined(inputOptions.raw)) {
			if (is_default.object(inputOptions.raw) && is_default.integer(inputOptions.raw.width) && is_default.inRange(inputOptions.raw.width, 1, 1e8) && is_default.integer(inputOptions.raw.height) && is_default.inRange(inputOptions.raw.height, 1, 1e8) && is_default.integer(inputOptions.raw.channels) && is_default.inRange(inputOptions.raw.channels, 1, 4)) {
				inputDescriptor.rawWidth = inputOptions.raw.width;
				inputDescriptor.rawHeight = inputOptions.raw.height;
				inputDescriptor.rawChannels = inputOptions.raw.channels;
				switch (input.constructor) {
					case Uint8Array:
					case Uint8ClampedArray:
						inputDescriptor.rawDepth = "uchar";
						break;
					case Int8Array:
						inputDescriptor.rawDepth = "char";
						break;
					case Uint16Array:
						inputDescriptor.rawDepth = "ushort";
						break;
					case Int16Array:
						inputDescriptor.rawDepth = "short";
						break;
					case Uint32Array:
						inputDescriptor.rawDepth = "uint";
						break;
					case Int32Array:
						inputDescriptor.rawDepth = "int";
						break;
					case Float32Array:
						inputDescriptor.rawDepth = "float";
						break;
					case Float64Array:
						inputDescriptor.rawDepth = "double";
						break;
					default: inputDescriptor.rawDepth = "uchar";
				}
			} else throw new Error("Expected width, height and channels for raw pixel input");
			inputDescriptor.rawPremultiplied = false;
			if (is_default.defined(inputOptions.raw.premultiplied)) if (is_default.bool(inputOptions.raw.premultiplied)) inputDescriptor.rawPremultiplied = inputOptions.raw.premultiplied;
			else throw is_default.invalidParameterError("raw.premultiplied", "boolean", inputOptions.raw.premultiplied);
			inputDescriptor.rawPageHeight = 0;
			if (is_default.defined(inputOptions.raw.pageHeight)) if (is_default.integer(inputOptions.raw.pageHeight) && inputOptions.raw.pageHeight > 0 && inputOptions.raw.pageHeight <= inputOptions.raw.height) {
				if (inputOptions.raw.height % inputOptions.raw.pageHeight !== 0) throw new Error(`Expected raw.height ${inputOptions.raw.height} to be a multiple of raw.pageHeight ${inputOptions.raw.pageHeight}`);
				inputDescriptor.rawPageHeight = inputOptions.raw.pageHeight;
			} else throw is_default.invalidParameterError("raw.pageHeight", "positive integer", inputOptions.raw.pageHeight);
		}
		if (is_default.defined(inputOptions.animated)) if (is_default.bool(inputOptions.animated)) inputDescriptor.pages = inputOptions.animated ? -1 : 1;
		else throw is_default.invalidParameterError("animated", "boolean", inputOptions.animated);
		if (is_default.defined(inputOptions.pages)) if (is_default.integer(inputOptions.pages) && is_default.inRange(inputOptions.pages, -1, 1e5)) inputDescriptor.pages = inputOptions.pages;
		else throw is_default.invalidParameterError("pages", "integer between -1 and 100000", inputOptions.pages);
		if (is_default.defined(inputOptions.page)) if (is_default.integer(inputOptions.page) && is_default.inRange(inputOptions.page, 0, 1e5)) inputDescriptor.page = inputOptions.page;
		else throw is_default.invalidParameterError("page", "integer between 0 and 100000", inputOptions.page);
		if (is_default.object(inputOptions.openSlide) && is_default.defined(inputOptions.openSlide.level)) if (is_default.integer(inputOptions.openSlide.level) && is_default.inRange(inputOptions.openSlide.level, 0, 256)) inputDescriptor.openSlideLevel = inputOptions.openSlide.level;
		else throw is_default.invalidParameterError("openSlide.level", "integer between 0 and 256", inputOptions.openSlide.level);
		else if (is_default.defined(inputOptions.level)) if (is_default.integer(inputOptions.level) && is_default.inRange(inputOptions.level, 0, 256)) inputDescriptor.openSlideLevel = inputOptions.level;
		else throw is_default.invalidParameterError("level", "integer between 0 and 256", inputOptions.level);
		if (is_default.object(inputOptions.tiff) && is_default.defined(inputOptions.tiff.subifd)) if (is_default.integer(inputOptions.tiff.subifd) && is_default.inRange(inputOptions.tiff.subifd, -1, 1e5)) inputDescriptor.tiffSubifd = inputOptions.tiff.subifd;
		else throw is_default.invalidParameterError("tiff.subifd", "integer between -1 and 100000", inputOptions.tiff.subifd);
		else if (is_default.defined(inputOptions.subifd)) if (is_default.integer(inputOptions.subifd) && is_default.inRange(inputOptions.subifd, -1, 1e5)) inputDescriptor.tiffSubifd = inputOptions.subifd;
		else throw is_default.invalidParameterError("subifd", "integer between -1 and 100000", inputOptions.subifd);
		if (is_default.object(inputOptions.svg)) {
			if (is_default.defined(inputOptions.svg.stylesheet)) if (is_default.string(inputOptions.svg.stylesheet)) inputDescriptor.svgStylesheet = inputOptions.svg.stylesheet;
			else throw is_default.invalidParameterError("svg.stylesheet", "string", inputOptions.svg.stylesheet);
			if (is_default.defined(inputOptions.svg.highBitdepth)) if (is_default.bool(inputOptions.svg.highBitdepth)) inputDescriptor.svgHighBitdepth = inputOptions.svg.highBitdepth;
			else throw is_default.invalidParameterError("svg.highBitdepth", "boolean", inputOptions.svg.highBitdepth);
		}
		if (is_default.object(inputOptions.pdf) && is_default.defined(inputOptions.pdf.background)) inputDescriptor.pdfBackground = this._getBackgroundColourOption(inputOptions.pdf.background);
		else if (is_default.defined(inputOptions.pdfBackground)) inputDescriptor.pdfBackground = this._getBackgroundColourOption(inputOptions.pdfBackground);
		if (is_default.object(inputOptions.jp2) && is_default.defined(inputOptions.jp2.oneshot)) if (is_default.bool(inputOptions.jp2.oneshot)) inputDescriptor.jp2Oneshot = inputOptions.jp2.oneshot;
		else throw is_default.invalidParameterError("jp2.oneshot", "boolean", inputOptions.jp2.oneshot);
		if (is_default.defined(inputOptions.create)) if (is_default.object(inputOptions.create) && is_default.integer(inputOptions.create.width) && is_default.inRange(inputOptions.create.width, 1, 1e8) && is_default.integer(inputOptions.create.height) && is_default.inRange(inputOptions.create.height, 1, 1e8) && is_default.integer(inputOptions.create.channels)) {
			inputDescriptor.createWidth = inputOptions.create.width;
			inputDescriptor.createHeight = inputOptions.create.height;
			inputDescriptor.createChannels = inputOptions.create.channels;
			inputDescriptor.createPageHeight = 0;
			if (is_default.defined(inputOptions.create.pageHeight)) if (is_default.integer(inputOptions.create.pageHeight) && inputOptions.create.pageHeight > 0 && inputOptions.create.pageHeight <= inputOptions.create.height) {
				if (inputOptions.create.height % inputOptions.create.pageHeight !== 0) throw new Error(`Expected create.height ${inputOptions.create.height} to be a multiple of create.pageHeight ${inputOptions.create.pageHeight}`);
				inputDescriptor.createPageHeight = inputOptions.create.pageHeight;
			} else throw is_default.invalidParameterError("create.pageHeight", "positive integer", inputOptions.create.pageHeight);
			if (is_default.defined(inputOptions.create.noise)) {
				if (!is_default.object(inputOptions.create.noise)) throw new Error("Expected noise to be an object");
				if (inputOptions.create.noise.type !== "gaussian") throw new Error("Only gaussian noise is supported at the moment");
				inputDescriptor.createNoiseType = inputOptions.create.noise.type;
				if (!is_default.inRange(inputOptions.create.channels, 1, 4)) throw is_default.invalidParameterError("create.channels", "number between 1 and 4", inputOptions.create.channels);
				inputDescriptor.createNoiseMean = 128;
				if (is_default.defined(inputOptions.create.noise.mean)) if (is_default.number(inputOptions.create.noise.mean) && is_default.inRange(inputOptions.create.noise.mean, 0, 1e4)) inputDescriptor.createNoiseMean = inputOptions.create.noise.mean;
				else throw is_default.invalidParameterError("create.noise.mean", "number between 0 and 10000", inputOptions.create.noise.mean);
				inputDescriptor.createNoiseSigma = 30;
				if (is_default.defined(inputOptions.create.noise.sigma)) if (is_default.number(inputOptions.create.noise.sigma) && is_default.inRange(inputOptions.create.noise.sigma, 0, 1e4)) inputDescriptor.createNoiseSigma = inputOptions.create.noise.sigma;
				else throw is_default.invalidParameterError("create.noise.sigma", "number between 0 and 10000", inputOptions.create.noise.sigma);
			} else if (is_default.defined(inputOptions.create.background)) {
				if (!is_default.inRange(inputOptions.create.channels, 3, 4)) throw is_default.invalidParameterError("create.channels", "number between 3 and 4", inputOptions.create.channels);
				inputDescriptor.createBackground = this._getBackgroundColourOption(inputOptions.create.background);
			} else throw new Error("Expected valid noise or background to create a new input image");
			delete inputDescriptor.buffer;
		} else throw new Error("Expected valid width, height and channels to create a new input image");
		if (is_default.defined(inputOptions.text)) if (is_default.object(inputOptions.text) && is_default.string(inputOptions.text.text)) {
			inputDescriptor.textValue = inputOptions.text.text;
			if (is_default.defined(inputOptions.text.height) && is_default.defined(inputOptions.text.dpi)) throw new Error("Expected only one of dpi or height");
			if (is_default.defined(inputOptions.text.font)) if (is_default.string(inputOptions.text.font)) inputDescriptor.textFont = inputOptions.text.font;
			else throw is_default.invalidParameterError("text.font", "string", inputOptions.text.font);
			if (is_default.defined(inputOptions.text.fontfile)) if (is_default.string(inputOptions.text.fontfile)) inputDescriptor.textFontfile = inputOptions.text.fontfile;
			else throw is_default.invalidParameterError("text.fontfile", "string", inputOptions.text.fontfile);
			if (is_default.defined(inputOptions.text.width)) if (is_default.integer(inputOptions.text.width) && is_default.inRange(inputOptions.text.width, 1, 1e6)) inputDescriptor.textWidth = inputOptions.text.width;
			else throw is_default.invalidParameterError("text.width", "integer between 1 and 1000000", inputOptions.text.width);
			if (is_default.defined(inputOptions.text.height)) if (is_default.integer(inputOptions.text.height) && is_default.inRange(inputOptions.text.height, 1, 1e6)) inputDescriptor.textHeight = inputOptions.text.height;
			else throw is_default.invalidParameterError("text.height", "integer between 1 and 1000000", inputOptions.text.height);
			if (is_default.defined(inputOptions.text.align)) if (is_default.string(inputOptions.text.align) && is_default.string(this.constructor.align[inputOptions.text.align])) inputDescriptor.textAlign = this.constructor.align[inputOptions.text.align];
			else throw is_default.invalidParameterError("text.align", "valid alignment", inputOptions.text.align);
			if (is_default.defined(inputOptions.text.justify)) if (is_default.bool(inputOptions.text.justify)) inputDescriptor.textJustify = inputOptions.text.justify;
			else throw is_default.invalidParameterError("text.justify", "boolean", inputOptions.text.justify);
			if (is_default.defined(inputOptions.text.dpi)) if (is_default.integer(inputOptions.text.dpi) && is_default.inRange(inputOptions.text.dpi, 1, 1e6)) inputDescriptor.textDpi = inputOptions.text.dpi;
			else throw is_default.invalidParameterError("text.dpi", "integer between 1 and 1000000", inputOptions.text.dpi);
			if (is_default.defined(inputOptions.text.rgba)) if (is_default.bool(inputOptions.text.rgba)) inputDescriptor.textRgba = inputOptions.text.rgba;
			else throw is_default.invalidParameterError("text.rgba", "bool", inputOptions.text.rgba);
			if (is_default.defined(inputOptions.text.spacing)) if (is_default.integer(inputOptions.text.spacing) && is_default.inRange(inputOptions.text.spacing, -1e6, 1e6)) inputDescriptor.textSpacing = inputOptions.text.spacing;
			else throw is_default.invalidParameterError("text.spacing", "integer between -1000000 and 1000000", inputOptions.text.spacing);
			if (is_default.defined(inputOptions.text.wrap)) if (is_default.string(inputOptions.text.wrap) && is_default.inArray(inputOptions.text.wrap, [
				"word",
				"char",
				"word-char",
				"none"
			])) inputDescriptor.textWrap = inputOptions.text.wrap;
			else throw is_default.invalidParameterError("text.wrap", "one of: word, char, word-char, none", inputOptions.text.wrap);
			delete inputDescriptor.buffer;
		} else throw new Error("Expected a valid string to create an image with text.");
		if (is_default.defined(inputOptions.join)) if (is_default.defined(this.options.join)) {
			if (is_default.defined(inputOptions.join.animated)) if (is_default.bool(inputOptions.join.animated)) inputDescriptor.joinAnimated = inputOptions.join.animated;
			else throw is_default.invalidParameterError("join.animated", "boolean", inputOptions.join.animated);
			if (is_default.defined(inputOptions.join.across)) if (is_default.integer(inputOptions.join.across) && is_default.inRange(inputOptions.join.across, 1, 1e6)) inputDescriptor.joinAcross = inputOptions.join.across;
			else throw is_default.invalidParameterError("join.across", "integer between 1 and 100000", inputOptions.join.across);
			if (is_default.defined(inputOptions.join.shim)) if (is_default.integer(inputOptions.join.shim) && is_default.inRange(inputOptions.join.shim, 0, 1e6)) inputDescriptor.joinShim = inputOptions.join.shim;
			else throw is_default.invalidParameterError("join.shim", "integer between 0 and 100000", inputOptions.join.shim);
			if (is_default.defined(inputOptions.join.background)) inputDescriptor.joinBackground = this._getBackgroundColourOption(inputOptions.join.background);
			if (is_default.defined(inputOptions.join.halign)) if (is_default.string(inputOptions.join.halign) && is_default.string(this.constructor.align[inputOptions.join.halign])) inputDescriptor.joinHalign = this.constructor.align[inputOptions.join.halign];
			else throw is_default.invalidParameterError("join.halign", "valid alignment", inputOptions.join.halign);
			if (is_default.defined(inputOptions.join.valign)) if (is_default.string(inputOptions.join.valign) && is_default.string(this.constructor.align[inputOptions.join.valign])) inputDescriptor.joinValign = this.constructor.align[inputOptions.join.valign];
			else throw is_default.invalidParameterError("join.valign", "valid alignment", inputOptions.join.valign);
		} else throw new Error("Expected input to be an array of images to join");
	} else if (is_default.defined(inputOptions)) throw new Error(`Invalid input options ${inputOptions}`);
	return inputDescriptor;
}
/**
* Handle incoming Buffer chunk on Writable Stream.
* @private
* @param {Buffer} chunk
* @param {string} encoding - unused
* @param {Function} callback
*/
function _write(chunk, _encoding, callback) {
	if (Array.isArray(this.options.input.buffer)) if (is_default.buffer(chunk)) {
		if (this.options.input.buffer.length === 0) this.on("finish", () => {
			this.streamInFinished = true;
		});
		this.options.input.buffer.push(chunk);
		callback();
	} else callback(/* @__PURE__ */ new Error("Non-Buffer data on Writable Stream"));
	else callback(/* @__PURE__ */ new Error("Unexpected data on Writable Stream"));
}
/**
* Flattens the array of chunks accumulated in input.buffer.
* @private
*/
function _flattenBufferIn() {
	if (this._isStreamInput()) this.options.input.buffer = Buffer.concat(this.options.input.buffer);
}
/**
* Are we expecting Stream-based input?
* @private
* @returns {boolean}
*/
function _isStreamInput() {
	return Array.isArray(this.options.input.buffer);
}
/**
* Fast access to (uncached) image metadata without decoding any compressed pixel data.
*
* This is read from the header of the input image.
* It does not take into consideration any operations to be applied to the output image,
* such as resize or rotate.
*
* Dimensions in the response will respect the `page` and `pages` properties of the
* {@link /api-constructor/ constructor parameters}.
*
* A `Promise` is returned when `callback` is not provided.
*
* - `format`: Name of decoder used to parse image e.g. `jpeg`, `png`, `webp`, `gif`, `svg`, `heif`, `tiff`
* - `mediaType`: Media Type (MIME Type) e.g. `image/jpeg`, `image/png`, `image/svg+xml`, `image/avif`
* - `size`: Total size of image in bytes, for Stream and Buffer input only
* - `width`: Number of pixels wide (EXIF orientation is not taken into consideration, see example below)
* - `height`: Number of pixels high (EXIF orientation is not taken into consideration, see example below)
* - `space`: Name of colour space interpretation e.g. `srgb`, `rgb`, `cmyk`, `lab`, `b-w` [...](https://www.libvips.org/API/current/enum.Interpretation.html)
* - `channels`: Number of bands e.g. `3` for sRGB, `4` for CMYK
* - `depth`: Name of pixel depth format e.g. `uchar`, `char`, `ushort`, `float` [...](https://www.libvips.org/API/current/enum.BandFormat.html)
* - `density`: Number of pixels per inch (DPI), if present
* - `chromaSubsampling`: String containing JPEG chroma subsampling, `4:2:0` or `4:4:4` for RGB, `4:2:0:4` or `4:4:4:4` for CMYK
* - `isProgressive`: Boolean indicating whether the image is interlaced using a progressive scan
* - `isPalette`: Boolean indicating whether the image is palette-based (GIF, PNG).
* - `bitsPerSample`: Number of bits per sample for each channel (GIF, PNG, HEIF).
* - `pages`: Number of pages/frames contained within the image, with support for TIFF, HEIF, PDF, animated GIF and animated WebP
* - `pageHeight`: Number of pixels high each page in a multi-page image will be.
* - `loop`: Number of times to loop an animated image, zero refers to a continuous loop.
* - `delay`: Delay in ms between each page in an animated image, provided as an array of integers.
* - `pagePrimary`: Number of the primary page in a HEIF image
* - `levels`: Details of each level in a multi-level image provided as an array of objects, requires libvips compiled with support for OpenSlide
* - `subifds`: Number of Sub Image File Directories in an OME-TIFF image
* - `background`: Default background colour, if present, for PNG (bKGD) and GIF images
* - `compression`: The encoder used to compress an HEIF file, `av1` (AVIF) or `hevc` (HEIC)
* - `resolutionUnit`: The unit of resolution (density), either `inch` or `cm`, if present
* - `hasProfile`: Boolean indicating the presence of an embedded ICC profile
* - `hasAlpha`: Boolean indicating the presence of an alpha transparency channel
* - `orientation`: Number value of the EXIF Orientation header, if present
* - `exif`: Buffer containing raw EXIF data, if present
* - `icc`: Buffer containing raw [ICC](https://www.npmjs.com/package/icc) profile data, if present
* - `iptc`: Buffer containing raw IPTC data, if present
* - `xmp`: Buffer containing raw XMP data, if present
* - `xmpAsString`: String containing XMP data, if valid UTF-8.
* - `tifftagPhotoshop`: Buffer containing raw TIFFTAG_PHOTOSHOP data, if present
* - `formatMagick`: String containing format for images loaded via *magick
* - `comments`: Array of keyword/text pairs representing PNG text blocks, if present.
* - `gainMap.image`: HDR gain map, if present, as compressed JPEG image.
*
* @example
* const metadata = await sharp(input).metadata();
*
* @example
* const image = sharp(inputJpg);
* image
*   .metadata()
*   .then(function(metadata) {
*     return image
*       .resize(Math.round(metadata.width / 2))
*       .webp()
*       .toBuffer();
*   })
*   .then(function(data) {
*     // data contains a WebP image half the width and height of the original JPEG
*   });
*
* @example
* // Get dimensions taking EXIF Orientation into account.
* const { autoOrient } = await sharp(input).metadata();
* const { width, height } = autoOrient;
*
* @param {Function} [callback] - called with the arguments `(err, metadata)`
* @returns {Promise<Object>|Sharp}
*/
function metadata(callback) {
	const stack = Error();
	if (is_default.fn(callback)) {
		if (this._isStreamInput()) this.on("finish", () => {
			this._flattenBufferIn();
			sharp_default.metadata(this.options, (err, metadata) => {
				if (err) callback(is_default.nativeError(err, stack));
				else callback(null, metadata);
			});
		});
		else sharp_default.metadata(this.options, (err, metadata) => {
			if (err) callback(is_default.nativeError(err, stack));
			else callback(null, metadata);
		});
		return this;
	} else if (this._isStreamInput()) return new Promise((resolve, reject) => {
		const finished = () => {
			this._flattenBufferIn();
			sharp_default.metadata(this.options, (err, metadata) => {
				if (err) reject(is_default.nativeError(err, stack));
				else resolve(metadata);
			});
		};
		if (this.writableFinished) finished();
		else this.once("finish", finished);
	});
	else return new Promise((resolve, reject) => {
		sharp_default.metadata(this.options, (err, metadata) => {
			if (err) reject(is_default.nativeError(err, stack));
			else resolve(metadata);
		});
	});
}
/**
* Access to pixel-derived image statistics for every channel in the image.
* A `Promise` is returned when `callback` is not provided.
*
* - `channels`: Array of channel statistics for each channel in the image. Each channel statistic contains
*     - `min` (minimum value in the channel)
*     - `max` (maximum value in the channel)
*     - `sum` (sum of all values in a channel)
*     - `squaresSum` (sum of squared values in a channel)
*     - `mean` (mean of the values in a channel)
*     - `stdev` (standard deviation for the values in a channel)
*     - `minX` (x-coordinate of one of the pixel where the minimum lies)
*     - `minY` (y-coordinate of one of the pixel where the minimum lies)
*     - `maxX` (x-coordinate of one of the pixel where the maximum lies)
*     - `maxY` (y-coordinate of one of the pixel where the maximum lies)
* - `isOpaque`: Is the image fully opaque? Will be `true` if the image has no alpha channel or if every pixel is fully opaque.
* - `entropy`: Histogram-based estimation of greyscale entropy, discarding alpha channel if any.
* - `sharpness`: Estimation of greyscale sharpness based on the standard deviation of a Laplacian convolution, discarding alpha channel if any.
* - `dominant`: Object containing most dominant sRGB colour based on a 4096-bin 3D histogram.
*
* **Note**: Statistics are derived from the original input image. Any operations performed on the image must first be
* written to a buffer in order to run `stats` on the result (see third example).
*
* @example
* const image = sharp(inputJpg);
* image
*   .stats()
*   .then(function(stats) {
*      // stats contains the channel-wise statistics array and the isOpaque value
*   });
*
* @example
* const { entropy, sharpness, dominant } = await sharp(input).stats();
* const { r, g, b } = dominant;
*
* @example
* const image = sharp(input);
* // store intermediate result
* const part = await image.extract(region).toBuffer();
* // create new instance to obtain statistics of extracted region
* const stats = await sharp(part).stats();
*
* @param {Function} [callback] - called with the arguments `(err, stats)`
* @returns {Promise<Object>}
*/
function stats(callback) {
	const stack = Error();
	if (is_default.fn(callback)) {
		if (this._isStreamInput()) this.on("finish", () => {
			this._flattenBufferIn();
			sharp_default.stats(this.options, (err, stats) => {
				if (err) callback(is_default.nativeError(err, stack));
				else callback(null, stats);
			});
		});
		else sharp_default.stats(this.options, (err, stats) => {
			if (err) callback(is_default.nativeError(err, stack));
			else callback(null, stats);
		});
		return this;
	} else if (this._isStreamInput()) return new Promise((resolve, reject) => {
		this.on("finish", function() {
			this._flattenBufferIn();
			sharp_default.stats(this.options, (err, stats) => {
				if (err) reject(is_default.nativeError(err, stack));
				else resolve(stats);
			});
		});
	});
	else return new Promise((resolve, reject) => {
		sharp_default.stats(this.options, (err, stats) => {
			if (err) reject(is_default.nativeError(err, stack));
			else resolve(stats);
		});
	});
}
/**
* Decorate the Sharp prototype with input-related functions.
* @module Sharp
* @private
*/
var input_default = (Sharp) => {
	Object.assign(Sharp.prototype, {
		_inputOptionsFromObject,
		_createInputDescriptor,
		_write,
		_flattenBufferIn,
		_isStreamInput,
		metadata,
		stats
	});
	Sharp.align = align;
};
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/resize.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
/**
* Weighting to apply when using contain/cover fit.
* @member
* @private
*/
var gravity = {
	center: 0,
	centre: 0,
	north: 1,
	east: 2,
	south: 3,
	west: 4,
	northeast: 5,
	southeast: 6,
	southwest: 7,
	northwest: 8
};
/**
* Position to apply when using contain/cover fit.
* @member
* @private
*/
var position = {
	top: 1,
	right: 2,
	bottom: 3,
	left: 4,
	"right top": 5,
	"right bottom": 6,
	"left bottom": 7,
	"left top": 8
};
/**
* How to extend the image.
* @member
* @private
*/
var extendWith = {
	background: "background",
	copy: "copy",
	repeat: "repeat",
	mirror: "mirror"
};
/**
* Strategies for automagic cover behaviour.
* @member
* @private
*/
var strategy = {
	entropy: 16,
	attention: 17
};
/**
* Reduction kernels.
* @member
* @private
*/
var kernel = {
	nearest: "nearest",
	linear: "linear",
	cubic: "cubic",
	mitchell: "mitchell",
	lanczos2: "lanczos2",
	lanczos3: "lanczos3",
	mks2013: "mks2013",
	mks2021: "mks2021"
};
/**
* Methods by which an image can be resized to fit the provided dimensions.
* @member
* @private
*/
var fit = {
	contain: "contain",
	cover: "cover",
	fill: "fill",
	inside: "inside",
	outside: "outside"
};
/**
* Map external fit property to internal canvas property.
* @member
* @private
*/
var mapFitToCanvas = {
	contain: "embed",
	cover: "crop",
	fill: "ignore_aspect",
	inside: "max",
	outside: "min"
};
/**
* @private
*/
function isRotationExpected(options) {
	return options.angle % 360 !== 0 || options.rotationAngle !== 0;
}
/**
* @private
*/
function isResizeExpected(options) {
	return options.width !== -1 || options.height !== -1;
}
/**
* Resize image to `width`, `height` or `width x height`.
*
* When both a `width` and `height` are provided, the possible methods by which the image should **fit** these are:
* - `cover`: (default) Preserving aspect ratio, attempt to ensure the image covers both provided dimensions by cropping/clipping to fit.
* - `contain`: Preserving aspect ratio, contain within both provided dimensions using "letterboxing" where necessary.
* - `fill`: Ignore the aspect ratio of the input and stretch to both provided dimensions.
* - `inside`: Preserving aspect ratio, resize the image to be as large as possible while ensuring its dimensions are less than or equal to both those specified.
* - `outside`: Preserving aspect ratio, resize the image to be as small as possible while ensuring its dimensions are greater than or equal to both those specified.
*
* Some of these values are based on the [object-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) CSS property.
*
* <img alt="Examples of various values for the fit property when resizing" width="100%" style="aspect-ratio: 998/243" src="/api-resize-fit.svg">
*
* When using a **fit** of `cover` or `contain`, the default **position** is `centre`. Other options are:
* - `sharp.position`: `top`, `right top`, `right`, `right bottom`, `bottom`, `left bottom`, `left`, `left top`.
* - `sharp.gravity`: `north`, `northeast`, `east`, `southeast`, `south`, `southwest`, `west`, `northwest`, `center` or `centre`.
* - `sharp.strategy`: `cover` only, dynamically crop using either the `entropy` or `attention` strategy.
*
* Some of these values are based on the [object-position](https://developer.mozilla.org/en-US/docs/Web/CSS/object-position) CSS property.
*
* The strategy-based approach initially resizes so one dimension is at its target length
* then repeatedly ranks edge regions, discarding the edge with the lowest score based on the selected strategy.
* - `entropy`: focus on the region with the highest [Shannon entropy](https://en.wikipedia.org/wiki/Entropy_%28information_theory%29).
* - `attention`: focus on the region with the highest luminance frequency, colour saturation and presence of skin tones.
*
* Possible downsizing kernels are:
* - `nearest`: Use [nearest neighbour interpolation](http://en.wikipedia.org/wiki/Nearest-neighbor_interpolation).
* - `linear`: Use a [triangle filter](https://en.wikipedia.org/wiki/Triangular_function).
* - `cubic`: Use a [Catmull-Rom spline](https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline).
* - `mitchell`: Use a [Mitchell-Netravali spline](https://www.cs.utexas.edu/~fussell/courses/cs384g-fall2013/lectures/mitchell/Mitchell.pdf).
* - `lanczos2`: Use a [Lanczos kernel](https://en.wikipedia.org/wiki/Lanczos_resampling#Lanczos_kernel) with `a=2`.
* - `lanczos3`: Use a Lanczos kernel with `a=3` (the default).
* - `mks2013`: Use a [Magic Kernel Sharp](https://johncostella.com/magic/mks.pdf) 2013 kernel, as adopted by Facebook.
* - `mks2021`: Use a Magic Kernel Sharp 2021 kernel, with more accurate (reduced) sharpening than the 2013 version.
*
* When upsampling, these kernels map to `nearest`, `linear` and `cubic` interpolators.
* Downsampling kernels without a matching upsampling interpolator map to `cubic`.
*
* Only one resize can occur per pipeline.
* Previous calls to `resize` in the same pipeline will be ignored.
*
* @example
* sharp(input)
*   .resize({ width: 100 })
*   .toBuffer()
*   .then(data => {
*     // 100 pixels wide, auto-scaled height
*   });
*
* @example
* sharp(input)
*   .resize({ height: 100 })
*   .toBuffer()
*   .then(data => {
*     // 100 pixels high, auto-scaled width
*   });
*
* @example
* sharp(input)
*   .resize(200, 300, {
*     kernel: sharp.kernel.nearest,
*     fit: 'contain',
*     position: 'right top',
*     background: { r: 255, g: 255, b: 255, alpha: 0.5 }
*   })
*   .toFile('output.png')
*   .then(() => {
*     // output.png is a 200 pixels wide and 300 pixels high image
*     // containing a nearest-neighbour scaled version
*     // contained within the north-east corner of a semi-transparent white canvas
*   });
*
* @example
* const transformer = sharp()
*   .resize({
*     width: 200,
*     height: 200,
*     fit: sharp.fit.cover,
*     position: sharp.strategy.entropy
*   });
* // Read image data from readableStream
* // Write 200px square auto-cropped image data to writableStream
* readableStream
*   .pipe(transformer)
*   .pipe(writableStream);
*
* @example
* sharp(input)
*   .resize(200, 200, {
*     fit: sharp.fit.inside,
*     withoutEnlargement: true
*   })
*   .toFormat('jpeg')
*   .toBuffer()
*   .then(function(outputBuffer) {
*     // outputBuffer contains JPEG image data
*     // no wider and no higher than 200 pixels
*     // and no larger than the input image
*   });
*
* @example
* sharp(input)
*   .resize(200, 200, {
*     fit: sharp.fit.outside,
*     withoutReduction: true
*   })
*   .toFormat('jpeg')
*   .toBuffer()
*   .then(function(outputBuffer) {
*     // outputBuffer contains JPEG image data
*     // of at least 200 pixels wide and 200 pixels high while maintaining aspect ratio
*     // and no smaller than the input image
*   });
*
* @example
* const scaleByHalf = await sharp(input)
*   .metadata()
*   .then(({ width }) => sharp(input)
*     .resize(Math.round(width * 0.5))
*     .toBuffer()
*   );
*
* @param {number} [width] - How many pixels wide the resultant image should be. Use `null` or `undefined` to auto-scale the width to match the height.
* @param {number} [height] - How many pixels high the resultant image should be. Use `null` or `undefined` to auto-scale the height to match the width.
* @param {Object} [options]
* @param {number} [options.width] - An alternative means of specifying `width`. If both are present this takes priority.
* @param {number} [options.height] - An alternative means of specifying `height`. If both are present this takes priority.
* @param {String} [options.fit='cover'] - How the image should be resized/cropped to fit the target dimension(s), one of `cover`, `contain`, `fill`, `inside` or `outside`.
* @param {String} [options.position='centre'] - A position, gravity or strategy to use when `fit` is `cover` or `contain`.
* @param {String|Object} [options.background={r: 0, g: 0, b: 0, alpha: 1}] - background colour when `fit` is `contain`, parsed by the [color](https://www.npmjs.org/package/color) module, defaults to black without transparency.
* @param {String} [options.kernel='lanczos3'] - The kernel to use for image reduction and the inferred interpolator to use for upsampling. Use the `fastShrinkOnLoad` option to control kernel vs shrink-on-load.
* @param {Boolean} [options.withoutEnlargement=false] - Do not scale up if the width *or* height are already less than the target dimensions, equivalent to GraphicsMagick's `>` geometry option. This may result in output dimensions smaller than the target dimensions.
* @param {Boolean} [options.withoutReduction=false] - Do not scale down if the width *or* height are already greater than the target dimensions, equivalent to GraphicsMagick's `<` geometry option. This may still result in a crop to reach the target dimensions.
* @param {Boolean} [options.fastShrinkOnLoad=true] - Take greater advantage of the JPEG and WebP shrink-on-load feature, which can lead to a slight moiré pattern or round-down of an auto-scaled dimension.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function resize(widthOrOptions, height, options) {
	if (isResizeExpected(this.options)) this.options.debuglog("ignoring previous resize options");
	if (this.options.widthPost !== -1) this.options.debuglog("operation order will be: extract, resize, extract");
	if (is_default.defined(widthOrOptions)) if (is_default.object(widthOrOptions) && !is_default.defined(options)) options = widthOrOptions;
	else if (is_default.integer(widthOrOptions) && widthOrOptions > 0) this.options.width = widthOrOptions;
	else throw is_default.invalidParameterError("width", "positive integer", widthOrOptions);
	else this.options.width = -1;
	if (is_default.defined(height)) if (is_default.integer(height) && height > 0) this.options.height = height;
	else throw is_default.invalidParameterError("height", "positive integer", height);
	else this.options.height = -1;
	if (is_default.object(options)) {
		if (is_default.defined(options.width)) if (is_default.integer(options.width) && options.width > 0) this.options.width = options.width;
		else throw is_default.invalidParameterError("width", "positive integer", options.width);
		if (is_default.defined(options.height)) if (is_default.integer(options.height) && options.height > 0) this.options.height = options.height;
		else throw is_default.invalidParameterError("height", "positive integer", options.height);
		if (is_default.defined(options.fit)) {
			const canvas = mapFitToCanvas[options.fit];
			if (is_default.string(canvas)) this.options.canvas = canvas;
			else throw is_default.invalidParameterError("fit", "valid fit", options.fit);
		}
		if (is_default.defined(options.position)) {
			const pos = is_default.integer(options.position) ? options.position : strategy[options.position] || position[options.position] || gravity[options.position];
			if (is_default.integer(pos) && (is_default.inRange(pos, 0, 8) || is_default.inRange(pos, 16, 17))) this.options.position = pos;
			else throw is_default.invalidParameterError("position", "valid position/gravity/strategy", options.position);
		}
		this._setBackgroundColourOption("resizeBackground", options.background);
		if (is_default.defined(options.kernel)) if (is_default.string(kernel[options.kernel])) this.options.kernel = kernel[options.kernel];
		else throw is_default.invalidParameterError("kernel", "valid kernel name", options.kernel);
		if (is_default.defined(options.withoutEnlargement)) this._setBooleanOption("withoutEnlargement", options.withoutEnlargement);
		if (is_default.defined(options.withoutReduction)) this._setBooleanOption("withoutReduction", options.withoutReduction);
		if (is_default.defined(options.fastShrinkOnLoad)) this._setBooleanOption("fastShrinkOnLoad", options.fastShrinkOnLoad);
	}
	if (isRotationExpected(this.options) && isResizeExpected(this.options)) this.options.rotateBefore = true;
	return this;
}
/**
* Extend / pad / extrude one or more edges of the image with either
* the provided background colour or pixels derived from the image.
* This operation will always occur after resizing and extraction, if any.
*
* @example
* // Resize to 140 pixels wide, then add 10 transparent pixels
* // to the top, left and right edges and 20 to the bottom edge
* sharp(input)
*   .resize(140)
*   .extend({
*     top: 10,
*     bottom: 20,
*     left: 10,
*     right: 10,
*     background: { r: 0, g: 0, b: 0, alpha: 0 }
*   })
*   ...
*
* @example
* // Add a row of 10 red pixels to the bottom
* sharp(input)
*   .extend({
*     bottom: 10,
*     background: 'red'
*   })
*   ...
*
* @example
* // Extrude image by 8 pixels to the right, mirroring existing right hand edge
* sharp(input)
*   .extend({
*     right: 8,
*     background: 'mirror'
*   })
*   ...
*
* @param {(number|Object)} extend - single pixel count to add to all edges or an Object with per-edge counts
* @param {number} [extend.top=0] - number of pixels to add to the top edge, valid values are integers in the range 0-10000
* @param {number} [extend.left=0] - number of pixels to add to the left edge, valid values are integers in the range 0-10000
* @param {number} [extend.bottom=0] - number of pixels to add to the bottom edge, valid values are integers in the range 0-10000
* @param {number} [extend.right=0] - number of pixels to add to the right edge, valid values are integers in the range 0-10000
* @param {String} [extend.extendWith='background'] - populate new pixels using this method, one of: background, copy, repeat, mirror.
* @param {String|Object} [extend.background={r: 0, g: 0, b: 0, alpha: 1}] - background colour, parsed by the [color](https://www.npmjs.org/package/color) module, defaults to black without transparency.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function extend(extend) {
	if (is_default.integer(extend)) if (is_default.inRange(extend, 1, 1e4)) {
		this.options.extendTop = extend;
		this.options.extendBottom = extend;
		this.options.extendLeft = extend;
		this.options.extendRight = extend;
	} else throw is_default.invalidParameterError("extend", "integer between 1 and 10000", extend);
	else if (is_default.object(extend)) {
		if (is_default.defined(extend.top)) if (is_default.integer(extend.top) && is_default.inRange(extend.top, 0, 1e4)) this.options.extendTop = extend.top;
		else throw is_default.invalidParameterError("top", "integer between 0 and 10000", extend.top);
		if (is_default.defined(extend.bottom)) if (is_default.integer(extend.bottom) && is_default.inRange(extend.bottom, 0, 1e4)) this.options.extendBottom = extend.bottom;
		else throw is_default.invalidParameterError("bottom", "integer between 0 and 10000", extend.bottom);
		if (is_default.defined(extend.left)) if (is_default.integer(extend.left) && is_default.inRange(extend.left, 0, 1e4)) this.options.extendLeft = extend.left;
		else throw is_default.invalidParameterError("left", "integer between 0 and 10000", extend.left);
		if (is_default.defined(extend.right)) if (is_default.integer(extend.right) && is_default.inRange(extend.right, 0, 1e4)) this.options.extendRight = extend.right;
		else throw is_default.invalidParameterError("right", "integer between 0 and 10000", extend.right);
		this._setBackgroundColourOption("extendBackground", extend.background);
		if (is_default.defined(extend.extendWith)) if (is_default.string(extendWith[extend.extendWith])) this.options.extendWith = extendWith[extend.extendWith];
		else throw is_default.invalidParameterError("extendWith", "one of: background, copy, repeat, mirror", extend.extendWith);
	} else throw is_default.invalidParameterError("extend", "integer or object", extend);
	return this;
}
/**
* Extract/crop a region of the image.
*
* - Use `extract` before `resize` for pre-resize extraction.
* - Use `extract` after `resize` for post-resize extraction.
* - Use `extract` twice and `resize` once for extract-then-resize-then-extract in a fixed operation order.
*
* @example
* sharp(input)
*   .extract({ left: left, top: top, width: width, height: height })
*   .toFile(output, function(err) {
*     // Extract a region of the input image, saving in the same format.
*   });
* @example
* sharp(input)
*   .extract({ left: leftOffsetPre, top: topOffsetPre, width: widthPre, height: heightPre })
*   .resize(width, height)
*   .extract({ left: leftOffsetPost, top: topOffsetPost, width: widthPost, height: heightPost })
*   .toFile(output, function(err) {
*     // Extract a region, resize, then extract from the resized image
*   });
*
* @param {Object} options - describes the region to extract using integral pixel values
* @param {number} options.left - zero-indexed offset from left edge, an integer between 0 and 100000000
* @param {number} options.top - zero-indexed offset from top edge, an integer between 0 and 100000000
* @param {number} options.width - width of region to extract, an integer between 0 and 100000000
* @param {number} options.height - height of region to extract, an integer between 0 and 100000000
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function extract(options) {
	const suffix = isResizeExpected(this.options) || this.options.widthPre !== -1 ? "Post" : "Pre";
	if (this.options[`width${suffix}`] !== -1) this.options.debuglog("ignoring previous extract options");
	[
		"left",
		"top",
		"width",
		"height"
	].forEach(function(name) {
		const value = options[name];
		if (is_default.integer(value) && is_default.inRange(value, 0, 1e8)) this.options[name + (name === "left" || name === "top" ? "Offset" : "") + suffix] = value;
		else throw is_default.invalidParameterError(name, "integer between 0 and 100000000", value);
	}, this);
	if (isRotationExpected(this.options) && !isResizeExpected(this.options)) {
		if (this.options.widthPre === -1 || this.options.widthPost === -1) this.options.rotateBefore = true;
	}
	if (this.options.input.autoOrient) this.options.orientBefore = true;
	return this;
}
/**
* Trim pixels from all edges that contain values similar to the given background colour, which defaults to that of the top-left pixel.
*
* Images with an alpha channel will use the combined bounding box of alpha and non-alpha channels.
*
* If the result of this operation would trim an image to nothing then no change is made.
*
* Use the `lineArt` and `threshold` options for control over sensitivity.
*
* The `info` response Object will contain `trimOffsetLeft` and `trimOffsetTop` properties.
*
* @example
* // Trim pixels with a colour similar to that of the top-left pixel.
* await sharp(input)
*   .trim()
*   .toFile(output);
*
* @example
* // Trim pixels with the exact same colour as that of the top-left pixel.
* await sharp(input)
*   .trim({
*     threshold: 0
*   })
*   .toFile(output);
*
* @example
* // Assume input is line art and trim only pixels with a similar colour to red.
* const output = await sharp(input)
*   .trim({
*     background: "#FF0000",
*     lineArt: true
*   })
*   .toBuffer();
*
* @example
* // Trim all "yellow-ish" pixels, being more lenient with the higher threshold.
* const output = await sharp(input)
*   .trim({
*     background: "yellow",
*     threshold: 42,
*   })
*   .toBuffer();
*
* @example
* // Trim image leaving (up to) a 10 pixel margin around the trimmed content.
* const output = await sharp(input)
*   .trim({
*     margin: 10
*   })
*   .toBuffer();
*
* @param {Object} [options]
* @param {string|Object} [options.background='top-left pixel'] - Background colour, parsed by the [color](https://www.npmjs.org/package/color) module, defaults to that of the top-left pixel.
* @param {number} [options.threshold=10] - Allowed difference from the above colour, a positive number.
* @param {boolean} [options.lineArt=false] - Does the input more closely resemble line art (e.g. vector) rather than being photographic?
* @param {number} [options.margin=0] - Leave a margin around trimmed content, integral number of pixels between 0 and 10000000.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function trim(options) {
	this.options.trimThreshold = 10;
	if (is_default.defined(options)) if (is_default.object(options)) {
		if (is_default.defined(options.background)) this._setBackgroundColourOption("trimBackground", options.background);
		if (is_default.defined(options.threshold)) if (is_default.number(options.threshold) && options.threshold >= 0) this.options.trimThreshold = options.threshold;
		else throw is_default.invalidParameterError("threshold", "positive number", options.threshold);
		if (is_default.defined(options.lineArt)) this._setBooleanOption("trimLineArt", options.lineArt);
		if (is_default.defined(options.margin)) if (is_default.integer(options.margin) && is_default.inRange(options.margin, 0, 1e7)) this.options.trimMargin = options.margin;
		else throw is_default.invalidParameterError("margin", "integer between 0 and 10000000", options.margin);
	} else throw is_default.invalidParameterError("trim", "object", options);
	if (isRotationExpected(this.options)) this.options.rotateBefore = true;
	return this;
}
/**
* Decorate the Sharp prototype with resize-related functions.
* @module Sharp
* @private
*/
var resize_default = (Sharp) => {
	Object.assign(Sharp.prototype, {
		resize,
		extend,
		extract,
		trim
	});
	Sharp.gravity = gravity;
	Sharp.strategy = strategy;
	Sharp.kernel = kernel;
	Sharp.fit = fit;
	Sharp.position = position;
};
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/composite.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
/**
* Blend modes.
* @member
* @private
*/
var blend = {
	clear: "clear",
	source: "source",
	over: "over",
	in: "in",
	out: "out",
	atop: "atop",
	dest: "dest",
	"dest-over": "dest-over",
	"dest-in": "dest-in",
	"dest-out": "dest-out",
	"dest-atop": "dest-atop",
	xor: "xor",
	add: "add",
	saturate: "saturate",
	multiply: "multiply",
	screen: "screen",
	overlay: "overlay",
	darken: "darken",
	lighten: "lighten",
	"colour-dodge": "colour-dodge",
	"color-dodge": "colour-dodge",
	"colour-burn": "colour-burn",
	"color-burn": "colour-burn",
	"hard-light": "hard-light",
	"soft-light": "soft-light",
	difference: "difference",
	exclusion: "exclusion"
};
/**
* Composite image(s) over the processed (resized, extracted etc.) image.
*
* The images to composite must be the same size or smaller than the processed image.
* If both `top` and `left` options are provided, they take precedence over `gravity`.
*
* Other operations in the same processing pipeline (e.g. resize, rotate, flip,
* flop, extract) will always be applied to the input image before composition.
*
* The `blend` option can be one of `clear`, `source`, `over`, `in`, `out`, `atop`,
* `dest`, `dest-over`, `dest-in`, `dest-out`, `dest-atop`,
* `xor`, `add`, `saturate`, `multiply`, `screen`, `overlay`, `darken`, `lighten`,
* `colour-dodge`, `color-dodge`, `colour-burn`,`color-burn`,
* `hard-light`, `soft-light`, `difference`, `exclusion`.
*
* More information about blend modes can be found at
* https://www.libvips.org/API/current/enum.BlendMode.html
* and https://www.cairographics.org/operators/
*
* @since 0.22.0
*
* @example
* await sharp(background)
*   .composite([
*     { input: layer1, gravity: 'northwest' },
*     { input: layer2, gravity: 'southeast' },
*   ])
*   .toFile('combined.png');
*
* @example
* const output = await sharp('input.gif', { animated: true })
*   .composite([
*     { input: 'overlay.png', tile: true, blend: 'saturate' }
*   ])
*   .toBuffer();
*
* @example
* sharp('input.png')
*   .rotate(180)
*   .resize(300)
*   .flatten( { background: '#ff6600' } )
*   .composite([{ input: 'overlay.png', gravity: 'southeast' }])
*   .sharpen()
*   .withMetadata()
*   .webp( { quality: 90 } )
*   .toBuffer()
*   .then(function(outputBuffer) {
*     // outputBuffer contains upside down, 300px wide, alpha channel flattened
*     // onto orange background, composited with overlay.png with SE gravity,
*     // sharpened, with metadata, 90% quality WebP image data. Phew!
*   });
*
* @param {Object[]} images - Ordered list of images to composite
* @param {Buffer|String} [images[].input] - Buffer containing image data, String containing the path to an image file, or Create object (see below)
* @param {Object} [images[].input.create] - describes a blank overlay to be created.
* @param {Number} [images[].input.create.width]
* @param {Number} [images[].input.create.height]
* @param {Number} [images[].input.create.channels] - 3-4
* @param {String|Object} [images[].input.create.background] - parsed by the [color](https://www.npmjs.org/package/color) module to extract values for red, green, blue and alpha.
* @param {Object} [images[].input.text] - describes a new text image to be created.
* @param {string} [images[].input.text.text] - text to render as a UTF-8 string. It can contain Pango markup, for example `<i>Le</i>Monde`.
* @param {string} [images[].input.text.font] - font name to render with.
* @param {string} [images[].input.text.fontfile] - absolute filesystem path to a font file that can be used by `font`.
* @param {number} [images[].input.text.width=0] - integral number of pixels to word-wrap at. Lines of text wider than this will be broken at word boundaries.
* @param {number} [images[].input.text.height=0] - integral number of pixels high. When defined, `dpi` will be ignored and the text will automatically fit the pixel resolution defined by `width` and `height`. Will be ignored if `width` is not specified or set to 0.
* @param {string} [images[].input.text.align='left'] - text alignment (`'left'`, `'centre'`, `'center'`, `'right'`).
* @param {boolean} [images[].input.text.justify=false] - set this to true to apply justification to the text.
* @param {number} [images[].input.text.dpi=72] - the resolution (size) at which to render the text. Does not take effect if `height` is specified.
* @param {boolean} [images[].input.text.rgba=false] - set this to true to enable RGBA output. This is useful for colour emoji rendering, or support for Pango markup features like `<span foreground="red">Red!</span>`.
* @param {number} [images[].input.text.spacing=0] - text line height in points. Will use the font line height if none is specified.
* @param {Boolean} [images[].autoOrient=false] - set to true to use EXIF orientation data, if present, to orient the image.
* @param {String} [images[].blend='over'] - how to blend this image with the image below.
* @param {String} [images[].gravity='centre'] - gravity at which to place the overlay.
* @param {Number} [images[].top] - the pixel offset from the top edge.
* @param {Number} [images[].left] - the pixel offset from the left edge.
* @param {Boolean} [images[].tile=false] - set to true to repeat the overlay image across the entire image with the given `gravity`.
* @param {Boolean} [images[].premultiplied=false] - set to true to avoid premultiplying the image below. Equivalent to the `--premultiplied` vips option.
* @param {Number} [images[].density=72] - number representing the DPI for vector overlay image.
* @param {Object} [images[].raw] - describes overlay when using raw pixel data.
* @param {Number} [images[].raw.width]
* @param {Number} [images[].raw.height]
* @param {Number} [images[].raw.channels]
* @param {boolean} [images[].animated=false] - Set to `true` to read all frames/pages of an animated image.
* @param {string} [images[].failOn='warning'] - @see {@link /api-constructor/ constructor parameters}
* @param {number|boolean} [images[].limitInputPixels=268402689] - @see {@link /api-constructor/ constructor parameters}
* @param {number|boolean} [images[].limitInputChannels=5] - @see {@link /api-constructor/ constructor parameters}
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function composite(images) {
	if (!Array.isArray(images)) throw is_default.invalidParameterError("images to composite", "array", images);
	this.options.composite = images.map((image) => {
		if (!is_default.object(image)) throw is_default.invalidParameterError("image to composite", "object", image);
		const inputOptions = this._inputOptionsFromObject(image);
		const composite = {
			input: this._createInputDescriptor(image.input, inputOptions, { allowStream: false }),
			blend: "over",
			tile: false,
			left: 0,
			top: 0,
			hasOffset: false,
			gravity: 0,
			premultiplied: false
		};
		if (is_default.defined(image.blend)) if (is_default.string(blend[image.blend])) composite.blend = blend[image.blend];
		else throw is_default.invalidParameterError("blend", "valid blend name", image.blend);
		if (is_default.defined(image.tile)) if (is_default.bool(image.tile)) composite.tile = image.tile;
		else throw is_default.invalidParameterError("tile", "boolean", image.tile);
		if (is_default.defined(image.left)) if (is_default.integer(image.left)) composite.left = image.left;
		else throw is_default.invalidParameterError("left", "integer", image.left);
		if (is_default.defined(image.top)) if (is_default.integer(image.top)) composite.top = image.top;
		else throw is_default.invalidParameterError("top", "integer", image.top);
		if (is_default.defined(image.top) !== is_default.defined(image.left)) throw new Error("Expected both left and top to be set");
		else composite.hasOffset = is_default.integer(image.top) && is_default.integer(image.left);
		if (is_default.defined(image.gravity)) if (is_default.integer(image.gravity) && is_default.inRange(image.gravity, 0, 8)) composite.gravity = image.gravity;
		else if (is_default.string(image.gravity) && is_default.integer(this.constructor.gravity[image.gravity])) composite.gravity = this.constructor.gravity[image.gravity];
		else throw is_default.invalidParameterError("gravity", "valid gravity", image.gravity);
		if (is_default.defined(image.premultiplied)) if (is_default.bool(image.premultiplied)) composite.premultiplied = image.premultiplied;
		else throw is_default.invalidParameterError("premultiplied", "boolean", image.premultiplied);
		return composite;
	});
	return this;
}
/**
* Decorate the Sharp prototype with composite-related functions.
* @module Sharp
* @private
*/
var composite_default = (Sharp) => {
	Sharp.prototype.composite = composite;
	Sharp.blend = blend;
};
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/operation.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
/**
* How accurate an operation should be.
* @member
* @private
*/
var vipsPrecision = {
	integer: "integer",
	float: "float",
	approximate: "approximate"
};
/**
* Rotate the output image.
*
* The provided angle is converted to a valid positive degree rotation.
* For example, `-450` will produce a 270 degree rotation.
*
* When rotating by an angle other than a multiple of 90,
* the background colour can be provided with the `background` option.
*
* For backwards compatibility, if no angle is provided, `.autoOrient()` will be called.
*
* Only one rotation can occur per pipeline (aside from an initial call without
* arguments to orient via EXIF data). Previous calls to `rotate` in the same
* pipeline will be ignored.
*
* Multi-page images can only be rotated by 180 degrees.
*
* Method order is important when rotating, resizing and/or extracting regions,
* for example `.rotate(x).extract(y)` will produce a different result to `.extract(y).rotate(x)`.
*
* @example
* const rotateThenResize = await sharp(input)
*   .rotate(90)
*   .resize({ width: 16, height: 8, fit: 'fill' })
*   .toBuffer();
* const resizeThenRotate = await sharp(input)
*   .resize({ width: 16, height: 8, fit: 'fill' })
*   .rotate(90)
*   .toBuffer();
*
* @param {number} [angle=auto] angle of rotation.
* @param {Object} [options] - if present, is an Object with optional attributes.
* @param {string|Object} [options.background="#000000"] parsed by the [color](https://www.npmjs.org/package/color) module to extract values for red, green, blue and alpha.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function rotate(angle, options) {
	if (!is_default.defined(angle)) return this.autoOrient();
	if (this.options.angle || this.options.rotationAngle) {
		this.options.debuglog("ignoring previous rotate options");
		this.options.angle = 0;
		this.options.rotationAngle = 0;
	}
	if (is_default.integer(angle) && !(angle % 90)) this.options.angle = angle;
	else if (is_default.number(angle)) {
		this.options.rotationAngle = angle;
		if (is_default.object(options) && options.background) this._setBackgroundColourOption("rotationBackground", options.background);
	} else throw is_default.invalidParameterError("angle", "numeric", angle);
	return this;
}
/**
* Auto-orient based on the EXIF `Orientation` tag, then remove the tag.
* Mirroring is supported and may infer the use of a flip operation.
*
* Previous or subsequent use of `rotate(angle)` and either `flip()` or `flop()`
* will logically occur after auto-orientation, regardless of call order.
*
* @example
* const output = await sharp(input).autoOrient().toBuffer();
*
* @example
* const pipeline = sharp()
*   .autoOrient()
*   .resize(null, 200)
*   .toBuffer(function (err, outputBuffer, info) {
*     // outputBuffer contains 200px high JPEG image data,
*     // auto-oriented using EXIF Orientation tag
*     // info.width and info.height contain the dimensions of the resized image
*   });
* readableStream.pipe(pipeline);
*
* @returns {Sharp}
*/
function autoOrient() {
	this.options.input.autoOrient = true;
	return this;
}
/**
* Mirror the image vertically (up-down) about the x-axis.
* This always occurs before rotation, if any.
*
* This operation does not work correctly with multi-page images.
*
* @example
* const output = await sharp(input).flip().toBuffer();
*
* @param {Boolean} [flip=true]
* @returns {Sharp}
*/
function flip(flip) {
	this.options.flip = is_default.bool(flip) ? flip : true;
	return this;
}
/**
* Mirror the image horizontally (left-right) about the y-axis.
* This always occurs before rotation, if any.
*
* @example
* const output = await sharp(input).flop().toBuffer();
*
* @param {Boolean} [flop=true]
* @returns {Sharp}
*/
function flop(flop) {
	this.options.flop = is_default.bool(flop) ? flop : true;
	return this;
}
/**
* Perform an affine transform on an image. This operation will always occur after resizing, extraction and rotation, if any.
*
* You must provide an array of length 4 or a 2x2 affine transformation matrix.
* By default, new pixels are filled with a black background. You can provide a background colour with the `background` option.
* A particular interpolator may also be specified. Set the `interpolator` option to an attribute of the `sharp.interpolators` Object e.g. `sharp.interpolators.nohalo`.
*
* In the case of a 2x2 matrix, the transform is:
* - X = `matrix[0, 0]` \* (x + `idx`) + `matrix[0, 1]` \* (y + `idy`) + `odx`
* - Y = `matrix[1, 0]` \* (x + `idx`) + `matrix[1, 1]` \* (y + `idy`) + `ody`
*
* where:
* - x and y are the coordinates in input image.
* - X and Y are the coordinates in output image.
* - (0,0) is the upper left corner.
*
* @since 0.27.0
*
* @example
* const pipeline = sharp()
*   .affine([[1, 0.3], [0.1, 0.7]], {
*      background: 'white',
*      interpolator: sharp.interpolators.nohalo
*   })
*   .toBuffer((err, outputBuffer, info) => {
*      // outputBuffer contains the transformed image
*      // info.width and info.height contain the new dimensions
*   });
*
* inputStream
*   .pipe(pipeline);
*
* @param {Array<Array<number>>|Array<number>} matrix - affine transformation matrix
* @param {Object} [options] - if present, is an Object with optional attributes.
* @param {String|Object} [options.background="#000000"] - parsed by the [color](https://www.npmjs.org/package/color) module to extract values for red, green, blue and alpha.
* @param {Number} [options.idx=0] - input horizontal offset
* @param {Number} [options.idy=0] - input vertical offset
* @param {Number} [options.odx=0] - output horizontal offset
* @param {Number} [options.ody=0] - output vertical offset
* @param {String} [options.interpolator=sharp.interpolators.bicubic] - interpolator
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function affine(matrix, options) {
	const flatMatrix = Array.isArray(matrix) && (matrix.length === 4 && matrix.every(is_default.number) || matrix.length === 2 && matrix.every((row) => Array.isArray(row) && row.length === 2)) ? matrix.flat() : [];
	if (flatMatrix.length === 4 && flatMatrix.every(is_default.number)) this.options.affineMatrix = flatMatrix;
	else throw is_default.invalidParameterError("matrix", "1x4 or 2x2 array", matrix);
	if (is_default.defined(options)) if (is_default.object(options)) {
		this._setBackgroundColourOption("affineBackground", options.background);
		if (is_default.defined(options.idx)) if (is_default.number(options.idx)) this.options.affineIdx = options.idx;
		else throw is_default.invalidParameterError("options.idx", "number", options.idx);
		if (is_default.defined(options.idy)) if (is_default.number(options.idy)) this.options.affineIdy = options.idy;
		else throw is_default.invalidParameterError("options.idy", "number", options.idy);
		if (is_default.defined(options.odx)) if (is_default.number(options.odx)) this.options.affineOdx = options.odx;
		else throw is_default.invalidParameterError("options.odx", "number", options.odx);
		if (is_default.defined(options.ody)) if (is_default.number(options.ody)) this.options.affineOdy = options.ody;
		else throw is_default.invalidParameterError("options.ody", "number", options.ody);
		if (is_default.defined(options.interpolator)) if (is_default.inArray(options.interpolator, Object.values(this.constructor.interpolators))) this.options.affineInterpolator = options.interpolator;
		else throw is_default.invalidParameterError("options.interpolator", "valid interpolator name", options.interpolator);
	} else throw is_default.invalidParameterError("options", "object", options);
	return this;
}
/**
* Sharpen the image.
*
* When used without parameters, performs a fast, mild sharpen of the output image.
*
* When a `sigma` is provided, performs a slower, more accurate sharpen of the L channel in the LAB colour space.
* Fine-grained control over the level of sharpening in "flat" (m1) and "jagged" (m2) areas is available.
*
* See {@link https://www.libvips.org/API/current/method.Image.sharpen.html libvips sharpen} operation.
*
* @example
* const data = await sharp(input).sharpen().toBuffer();
*
* @example
* const data = await sharp(input).sharpen({ sigma: 2 }).toBuffer();
*
* @example
* const data = await sharp(input)
*   .sharpen({
*     sigma: 2,
*     m1: 0,
*     m2: 3,
*     x1: 3,
*     y2: 15,
*     y3: 15,
*   })
*   .toBuffer();
*
* @param {Object} [options] - if present, is an Object with attributes
* @param {number} [options.sigma] - the sigma of the Gaussian mask, where `sigma = 1 + radius / 2`, between 0.000001 and 10
* @param {number} [options.m1=1.0] - the level of sharpening to apply to "flat" areas, between 0 and 1000000
* @param {number} [options.m2=2.0] - the level of sharpening to apply to "jagged" areas, between 0 and 1000000
* @param {number} [options.x1=2.0] - threshold between "flat" and "jagged", between 0 and 1000000
* @param {number} [options.y2=10.0] - maximum amount of brightening, between 0 and 1000000
* @param {number} [options.y3=20.0] - maximum amount of darkening, between 0 and 1000000
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function sharpen(options) {
	if (is_default.plainObject(options)) {
		if (is_default.number(options.sigma) && is_default.inRange(options.sigma, 1e-6, 10)) this.options.sharpenSigma = options.sigma;
		else throw is_default.invalidParameterError("options.sigma", "number between 0.000001 and 10", options.sigma);
		if (is_default.defined(options.m1)) if (is_default.number(options.m1) && is_default.inRange(options.m1, 0, 1e6)) this.options.sharpenM1 = options.m1;
		else throw is_default.invalidParameterError("options.m1", "number between 0 and 1000000", options.m1);
		if (is_default.defined(options.m2)) if (is_default.number(options.m2) && is_default.inRange(options.m2, 0, 1e6)) this.options.sharpenM2 = options.m2;
		else throw is_default.invalidParameterError("options.m2", "number between 0 and 1000000", options.m2);
		if (is_default.defined(options.x1)) if (is_default.number(options.x1) && is_default.inRange(options.x1, 0, 1e6)) this.options.sharpenX1 = options.x1;
		else throw is_default.invalidParameterError("options.x1", "number between 0 and 1000000", options.x1);
		if (is_default.defined(options.y2)) if (is_default.number(options.y2) && is_default.inRange(options.y2, 0, 1e6)) this.options.sharpenY2 = options.y2;
		else throw is_default.invalidParameterError("options.y2", "number between 0 and 1000000", options.y2);
		if (is_default.defined(options.y3)) if (is_default.number(options.y3) && is_default.inRange(options.y3, 0, 1e6)) this.options.sharpenY3 = options.y3;
		else throw is_default.invalidParameterError("options.y3", "number between 0 and 1000000", options.y3);
	} else this.options.sharpenSigma = -1;
	return this;
}
/**
* Apply median filter.
* When used without parameters the default window is 3x3.
*
* @example
* const output = await sharp(input).median().toBuffer();
*
* @example
* const output = await sharp(input).median(5).toBuffer();
*
* @param {number} [size=3] square mask size: size x size
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function median(size) {
	if (!is_default.defined(size)) this.options.medianSize = 3;
	else if (is_default.integer(size) && is_default.inRange(size, 1, 1e3)) this.options.medianSize = size;
	else throw is_default.invalidParameterError("size", "integer between 1 and 1000", size);
	return this;
}
/**
* Blur the image.
*
* When used without parameters, performs a fast 3x3 box blur (equivalent to a box linear filter).
*
* When a `sigma` is provided, performs a slower, more accurate Gaussian blur.
*
* @example
* const boxBlurred = await sharp(input)
*   .blur()
*   .toBuffer();
*
* @example
* const gaussianBlurred = await sharp(input)
*   .blur(5)
*   .toBuffer();
*
* @param {Object|number|Boolean} [options]
* @param {number} [options.sigma] a value between 0.3 and 1000 representing the sigma of the Gaussian mask, where `sigma = 1 + radius / 2`.
* @param {string} [options.precision='integer'] How accurate the operation should be, one of: integer, float, approximate.
* @param {number} [options.minAmplitude=0.2] A value between 0.001 and 1. A smaller value will generate a larger, more accurate mask.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function blur(options) {
	let sigma;
	if (is_default.number(options)) sigma = options;
	else if (is_default.plainObject(options)) {
		if (!is_default.number(options.sigma)) throw is_default.invalidParameterError("options.sigma", "number between 0.3 and 1000", sigma);
		sigma = options.sigma;
		if ("precision" in options) if (is_default.string(vipsPrecision[options.precision])) this.options.precision = vipsPrecision[options.precision];
		else throw is_default.invalidParameterError("precision", "one of: integer, float, approximate", options.precision);
		if ("minAmplitude" in options) if (is_default.number(options.minAmplitude) && is_default.inRange(options.minAmplitude, .001, 1)) this.options.minAmpl = options.minAmplitude;
		else throw is_default.invalidParameterError("minAmplitude", "number between 0.001 and 1", options.minAmplitude);
	}
	if (!is_default.defined(options)) this.options.blurSigma = -1;
	else if (is_default.bool(options)) this.options.blurSigma = options ? -1 : 0;
	else if (is_default.number(sigma) && is_default.inRange(sigma, .3, 1e3)) this.options.blurSigma = sigma;
	else throw is_default.invalidParameterError("sigma", "number between 0.3 and 1000", sigma);
	return this;
}
/**
* Expand foreground objects using the dilate morphological operator.
*
* @example
* const output = await sharp(input)
*   .dilate()
*   .toBuffer();
*
* @param {Number} [width=1] dilation width in pixels.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function dilate(width) {
	if (!is_default.defined(width)) this.options.dilateWidth = 1;
	else if (is_default.integer(width) && is_default.inRange(width, 1, 65536)) this.options.dilateWidth = width;
	else throw is_default.invalidParameterError("width", "integer between 1 and 65536", width);
	return this;
}
/**
* Shrink foreground objects using the erode morphological operator.
*
* @example
* const output = await sharp(input)
*   .erode()
*   .toBuffer();
*
* @param {Number} [width=1] erosion width in pixels.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function erode(width) {
	if (!is_default.defined(width)) this.options.erodeWidth = 1;
	else if (is_default.integer(width) && is_default.inRange(width, 1, 65536)) this.options.erodeWidth = width;
	else throw is_default.invalidParameterError("width", "integer between 1 and 65536", width);
	return this;
}
/**
* Merge alpha transparency channel, if any, with a background, then remove the alpha channel.
*
* See also {@link /api-channel#removealpha removeAlpha}.
*
* @example
* await sharp(rgbaInput)
*   .flatten({ background: '#F0A703' })
*   .toBuffer();
*
* @param {Object} [options]
* @param {string|Object} [options.background={r: 0, g: 0, b: 0}] - background colour, parsed by the [color](https://www.npmjs.org/package/color) module, defaults to black.
* @returns {Sharp}
*/
function flatten(options) {
	this.options.flatten = is_default.bool(options) ? options : true;
	if (is_default.object(options)) this._setBackgroundColourOption("flattenBackground", options.background);
	return this;
}
/**
* Ensure the image has an alpha channel
* with all white pixel values made fully transparent.
*
* Existing alpha channel values for non-white pixels remain unchanged.
*
* @since 0.32.1
*
* @example
* await sharp(rgbInput)
*   .unflatten()
*   .toBuffer();
*
* @example
* await sharp(rgbInput)
*   .threshold(128, { grayscale: false }) // converter bright pixels to white
*   .unflatten()
*   .toBuffer();
*/
function unflatten() {
	this.options.unflatten = true;
	return this;
}
/**
* Apply a gamma correction by reducing the encoding (darken) pre-resize at a factor of `1/gamma`
* then increasing the encoding (brighten) post-resize at a factor of `gamma`.
* This can improve the perceived brightness of a resized image in non-linear colour spaces.
* JPEG and WebP input images will not take advantage of the shrink-on-load performance optimisation
* when applying a gamma correction.
*
* Supply a second argument to use a different output gamma value, otherwise the first value is used in both cases.
*
* @param {number} [gamma=2.2] value between 1.0 and 3.0.
* @param {number} [gammaOut] value between 1.0 and 3.0. (optional, defaults to same as `gamma`)
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function gamma(gamma, gammaOut) {
	if (!is_default.defined(gamma)) this.options.gamma = 2.2;
	else if (is_default.number(gamma) && is_default.inRange(gamma, 1, 3)) this.options.gamma = gamma;
	else throw is_default.invalidParameterError("gamma", "number between 1.0 and 3.0", gamma);
	if (!is_default.defined(gammaOut)) this.options.gammaOut = this.options.gamma;
	else if (is_default.number(gammaOut) && is_default.inRange(gammaOut, 1, 3)) this.options.gammaOut = gammaOut;
	else throw is_default.invalidParameterError("gammaOut", "number between 1.0 and 3.0", gammaOut);
	return this;
}
/**
* Produce the "negative" of the image.
*
* @example
* const output = await sharp(input)
*   .negate()
*   .toBuffer();
*
* @example
* const output = await sharp(input)
*   .negate({ alpha: false })
*   .toBuffer();
*
* @param {Object} [options]
* @param {Boolean} [options.alpha=true] Whether or not to negate any alpha channel
* @returns {Sharp}
*/
function negate(options) {
	this.options.negate = is_default.bool(options) ? options : true;
	if (is_default.plainObject(options) && "alpha" in options) if (!is_default.bool(options.alpha)) throw is_default.invalidParameterError("alpha", "should be boolean value", options.alpha);
	else this.options.negateAlpha = options.alpha;
	return this;
}
/**
* Enhance output image contrast by stretching its luminance to cover a full dynamic range.
*
* Uses a histogram-based approach, taking a default range of 1% to 99% to reduce sensitivity to noise at the extremes.
*
* Luminance values below the `lower` percentile will be underexposed by clipping to zero.
* Luminance values above the `upper` percentile will be overexposed by clipping to the max pixel value.
*
* @example
* const output = await sharp(input)
*   .normalise()
*   .toBuffer();
*
* @example
* const output = await sharp(input)
*   .normalise({ lower: 0, upper: 100 })
*   .toBuffer();
*
* @param {Object} [options]
* @param {number} [options.lower=1] - Percentile below which luminance values will be underexposed.
* @param {number} [options.upper=99] - Percentile above which luminance values will be overexposed.
* @returns {Sharp}
*/
function normalise(options) {
	if (is_default.plainObject(options)) {
		if (is_default.defined(options.lower)) if (is_default.number(options.lower) && is_default.inRange(options.lower, 0, 99)) this.options.normaliseLower = options.lower;
		else throw is_default.invalidParameterError("lower", "number between 0 and 99", options.lower);
		if (is_default.defined(options.upper)) if (is_default.number(options.upper) && is_default.inRange(options.upper, 1, 100)) this.options.normaliseUpper = options.upper;
		else throw is_default.invalidParameterError("upper", "number between 1 and 100", options.upper);
	}
	if (this.options.normaliseLower >= this.options.normaliseUpper) throw is_default.invalidParameterError("range", "lower to be less than upper", `${this.options.normaliseLower} >= ${this.options.normaliseUpper}`);
	this.options.normalise = true;
	return this;
}
/**
* Alternative spelling of normalise.
*
* @example
* const output = await sharp(input)
*   .normalize()
*   .toBuffer();
*
* @param {Object} [options]
* @param {number} [options.lower=1] - Percentile below which luminance values will be underexposed.
* @param {number} [options.upper=99] - Percentile above which luminance values will be overexposed.
* @returns {Sharp}
*/
function normalize(options) {
	return this.normalise(options);
}
/**
* Perform contrast limiting adaptive histogram equalization
* {@link https://en.wikipedia.org/wiki/Adaptive_histogram_equalization#Contrast_Limited_AHE CLAHE}.
*
* This will, in general, enhance the clarity of the image by bringing out darker details.
*
* @since 0.28.3
*
* @example
* const output = await sharp(input)
*   .clahe({
*     width: 3,
*     height: 3,
*   })
*   .toBuffer();
*
* @param {Object} options
* @param {number} options.width - Integral width of the search window, in pixels, between 1 and 65536.
* @param {number} options.height - Integral height of the search window, in pixels, between 1 and 65536.
* @param {number} [options.maxSlope=3] - Integral level of brightening, between 0 and 100, where 0 disables contrast limiting.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function clahe(options) {
	if (is_default.plainObject(options)) {
		if (is_default.integer(options.width) && is_default.inRange(options.width, 1, 65536)) this.options.claheWidth = options.width;
		else throw is_default.invalidParameterError("width", "integer between 1 and 65536", options.width);
		if (is_default.integer(options.height) && is_default.inRange(options.height, 1, 65536)) this.options.claheHeight = options.height;
		else throw is_default.invalidParameterError("height", "integer between 1 and 65536", options.height);
		if (is_default.defined(options.maxSlope)) if (is_default.integer(options.maxSlope) && is_default.inRange(options.maxSlope, 0, 100)) this.options.claheMaxSlope = options.maxSlope;
		else throw is_default.invalidParameterError("maxSlope", "integer between 0 and 100", options.maxSlope);
	} else throw is_default.invalidParameterError("options", "plain object", options);
	return this;
}
/**
* Convolve the image with the specified kernel.
*
* @example
* sharp(input)
*   .convolve({
*     width: 3,
*     height: 3,
*     kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1]
*   })
*   .raw()
*   .toBuffer(function(err, data, info) {
*     // data contains the raw pixel data representing the convolution
*     // of the input image with the horizontal Sobel operator
*   });
*
* @param {Object} kernel
* @param {number} kernel.width - width of the kernel in pixels.
* @param {number} kernel.height - height of the kernel in pixels.
* @param {Array<number>} kernel.kernel - Array of length `width*height` containing the kernel values.
* @param {number} [kernel.scale=sum] - the scale of the kernel in pixels.
* @param {number} [kernel.offset=0] - the offset of the kernel in pixels.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function convolve(kernel) {
	if (!is_default.object(kernel) || !Array.isArray(kernel.kernel) || !is_default.integer(kernel.width) || !is_default.integer(kernel.height) || !is_default.inRange(kernel.width, 3, 1001) || !is_default.inRange(kernel.height, 3, 1001) || kernel.height * kernel.width !== kernel.kernel.length || !kernel.kernel.every(is_default.number)) throw new Error("Invalid convolution kernel");
	if (!is_default.integer(kernel.scale)) kernel.scale = kernel.kernel.reduce((a, b) => a + b, 0);
	if (kernel.scale < 1) kernel.scale = 1;
	if (!is_default.integer(kernel.offset)) kernel.offset = 0;
	this.options.convKernel = kernel;
	return this;
}
/**
* Any pixel value greater than or equal to the threshold value will be set to 255, otherwise it will be set to 0.
* @param {number} [threshold=128] - a value in the range 0-255 representing the level at which the threshold will be applied.
* @param {Object} [options]
* @param {Boolean} [options.greyscale=true] - convert to single channel greyscale.
* @param {Boolean} [options.grayscale=true] - alternative spelling for greyscale.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function threshold(threshold, options) {
	if (!is_default.defined(threshold)) this.options.threshold = 128;
	else if (is_default.bool(threshold)) this.options.threshold = threshold ? 128 : 0;
	else if (is_default.integer(threshold) && is_default.inRange(threshold, 0, 255)) this.options.threshold = threshold;
	else throw is_default.invalidParameterError("threshold", "integer between 0 and 255", threshold);
	if (!is_default.object(options) || options.greyscale === true || options.grayscale === true) this.options.thresholdGrayscale = true;
	else this.options.thresholdGrayscale = false;
	return this;
}
/**
* Perform a bitwise boolean operation with operand image.
*
* This operation creates an output image where each pixel is the result of
* the selected bitwise boolean `operation` between the corresponding pixels of the input images.
*
* @param {Buffer|string} operand - Buffer containing image data or string containing the path to an image file.
* @param {string} operator - one of `and`, `or` or `eor` to perform that bitwise operation, like the C logic operators `&`, `|` and `^` respectively.
* @param {Object} [options]
* @param {Object} [options.raw] - describes operand when using raw pixel data.
* @param {number} [options.raw.width]
* @param {number} [options.raw.height]
* @param {number} [options.raw.channels]
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function boolean(operand, operator, options) {
	this.options.boolean = this._createInputDescriptor(operand, options);
	if (is_default.string(operator) && is_default.inArray(operator, [
		"and",
		"or",
		"eor"
	])) this.options.booleanOp = operator;
	else throw is_default.invalidParameterError("operator", "one of: and, or, eor", operator);
	return this;
}
/**
* Apply the linear formula `a` * input + `b` to the image to adjust image levels.
*
* When a single number is provided, it will be used for all image channels.
* When an array of numbers is provided, the array length must match the number of channels.
*
* @example
* await sharp(input)
*   .linear(0.5, 2)
*   .toBuffer();
*
* @example
* await sharp(rgbInput)
*   .linear(
*     [0.25, 0.5, 0.75],
*     [150, 100, 50]
*   )
*   .toBuffer();
*
* @param {(number|number[])} [a=[]] multiplier
* @param {(number|number[])} [b=[]] offset
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function linear(a, b) {
	if (!is_default.defined(a) && is_default.number(b)) a = 1;
	else if (is_default.number(a) && !is_default.defined(b)) b = 0;
	if (!is_default.defined(a)) this.options.linearA = [];
	else if (is_default.number(a)) this.options.linearA = [a];
	else if (Array.isArray(a) && a.length && a.every(is_default.number)) this.options.linearA = a;
	else throw is_default.invalidParameterError("a", "number or array of numbers", a);
	if (!is_default.defined(b)) this.options.linearB = [];
	else if (is_default.number(b)) this.options.linearB = [b];
	else if (Array.isArray(b) && b.length && b.every(is_default.number)) this.options.linearB = b;
	else throw is_default.invalidParameterError("b", "number or array of numbers", b);
	if (this.options.linearA.length !== this.options.linearB.length) throw new Error("Expected a and b to be arrays of the same length");
	return this;
}
/**
* Recombine the image with the specified matrix.
*
* @since 0.21.1
*
* @example
* sharp(input)
*   .recomb([
*    [0.3588, 0.7044, 0.1368],
*    [0.2990, 0.5870, 0.1140],
*    [0.2392, 0.4696, 0.0912],
*   ])
*   .raw()
*   .toBuffer(function(err, data, info) {
*     // data contains the raw pixel data after applying the matrix
*     // With this example input, a sepia filter has been applied
*   });
*
* @param {Array<Array<number>>} inputMatrix - 3x3 or 4x4 Recombination matrix
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function recomb(inputMatrix) {
	if (!Array.isArray(inputMatrix)) throw is_default.invalidParameterError("inputMatrix", "array", inputMatrix);
	const dimensions = inputMatrix.length;
	if (dimensions !== 3 && dimensions !== 4) throw is_default.invalidParameterError("inputMatrix", "3x3 or 4x4 array", dimensions);
	if (!inputMatrix.every((row) => Array.isArray(row) && row.length === dimensions)) throw is_default.invalidParameterError("inputMatrix", `array of ${dimensions} arrays of length ${dimensions}`, inputMatrix);
	const recombMatrix = inputMatrix.flat();
	if (!recombMatrix.every(is_default.number)) throw is_default.invalidParameterError("inputMatrix", "array of numbers", recombMatrix);
	this.options.recombMatrix = recombMatrix;
	return this;
}
/**
* Transforms the image using brightness, saturation, hue rotation, and lightness.
* Brightness and lightness both operate on luminance, with the difference being that
* brightness is multiplicative whereas lightness is additive.
*
* @since 0.22.1
*
* @example
* // increase brightness by a factor of 2
* const output = await sharp(input)
*   .modulate({
*     brightness: 2
*   })
*   .toBuffer();
*
* @example
* // hue-rotate by 180 degrees
* const output = await sharp(input)
*   .modulate({
*     hue: 180
*   })
*   .toBuffer();
*
* @example
* // increase lightness by +50
* const output = await sharp(input)
*   .modulate({
*     lightness: 50
*   })
*   .toBuffer();
*
* @example
* // decrease brightness and saturation while also hue-rotating by 90 degrees
* const output = await sharp(input)
*   .modulate({
*     brightness: 0.5,
*     saturation: 0.5,
*     hue: 90,
*   })
*   .toBuffer();
*
* @param {Object} [options]
* @param {number} [options.brightness] Brightness multiplier
* @param {number} [options.saturation] Saturation multiplier
* @param {number} [options.hue] Degrees for hue rotation
* @param {number} [options.lightness] Lightness addend
* @returns {Sharp}
*/
function modulate(options) {
	if (!is_default.plainObject(options)) throw is_default.invalidParameterError("options", "plain object", options);
	if ("brightness" in options) if (is_default.number(options.brightness) && options.brightness >= 0) this.options.brightness = options.brightness;
	else throw is_default.invalidParameterError("brightness", "number above zero", options.brightness);
	if ("saturation" in options) if (is_default.number(options.saturation) && options.saturation >= 0) this.options.saturation = options.saturation;
	else throw is_default.invalidParameterError("saturation", "number above zero", options.saturation);
	if ("hue" in options) if (is_default.integer(options.hue)) this.options.hue = options.hue % 360;
	else throw is_default.invalidParameterError("hue", "number", options.hue);
	if ("lightness" in options) if (is_default.number(options.lightness)) this.options.lightness = options.lightness;
	else throw is_default.invalidParameterError("lightness", "number", options.lightness);
	return this;
}
/**
* Decorate the Sharp prototype with operation-related functions.
* @module Sharp
* @private
*/
var operation_default = (Sharp) => {
	Object.assign(Sharp.prototype, {
		autoOrient,
		rotate,
		flip,
		flop,
		affine,
		sharpen,
		erode,
		dilate,
		median,
		blur,
		flatten,
		unflatten,
		gamma,
		negate,
		normalise,
		normalize,
		clahe,
		convolve,
		threshold,
		boolean,
		linear,
		recomb,
		modulate
	});
};
//#endregion
//#region node_modules/.pnpm/@img+colour@1.1.0/node_modules/@img/colour/color.cjs
var require_color = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var index_exports = {};
	__export(index_exports, { default: () => index_default });
	module.exports = __toCommonJS(index_exports);
	var colors = {
		aliceblue: [
			240,
			248,
			255
		],
		antiquewhite: [
			250,
			235,
			215
		],
		aqua: [
			0,
			255,
			255
		],
		aquamarine: [
			127,
			255,
			212
		],
		azure: [
			240,
			255,
			255
		],
		beige: [
			245,
			245,
			220
		],
		bisque: [
			255,
			228,
			196
		],
		black: [
			0,
			0,
			0
		],
		blanchedalmond: [
			255,
			235,
			205
		],
		blue: [
			0,
			0,
			255
		],
		blueviolet: [
			138,
			43,
			226
		],
		brown: [
			165,
			42,
			42
		],
		burlywood: [
			222,
			184,
			135
		],
		cadetblue: [
			95,
			158,
			160
		],
		chartreuse: [
			127,
			255,
			0
		],
		chocolate: [
			210,
			105,
			30
		],
		coral: [
			255,
			127,
			80
		],
		cornflowerblue: [
			100,
			149,
			237
		],
		cornsilk: [
			255,
			248,
			220
		],
		crimson: [
			220,
			20,
			60
		],
		cyan: [
			0,
			255,
			255
		],
		darkblue: [
			0,
			0,
			139
		],
		darkcyan: [
			0,
			139,
			139
		],
		darkgoldenrod: [
			184,
			134,
			11
		],
		darkgray: [
			169,
			169,
			169
		],
		darkgreen: [
			0,
			100,
			0
		],
		darkgrey: [
			169,
			169,
			169
		],
		darkkhaki: [
			189,
			183,
			107
		],
		darkmagenta: [
			139,
			0,
			139
		],
		darkolivegreen: [
			85,
			107,
			47
		],
		darkorange: [
			255,
			140,
			0
		],
		darkorchid: [
			153,
			50,
			204
		],
		darkred: [
			139,
			0,
			0
		],
		darksalmon: [
			233,
			150,
			122
		],
		darkseagreen: [
			143,
			188,
			143
		],
		darkslateblue: [
			72,
			61,
			139
		],
		darkslategray: [
			47,
			79,
			79
		],
		darkslategrey: [
			47,
			79,
			79
		],
		darkturquoise: [
			0,
			206,
			209
		],
		darkviolet: [
			148,
			0,
			211
		],
		deeppink: [
			255,
			20,
			147
		],
		deepskyblue: [
			0,
			191,
			255
		],
		dimgray: [
			105,
			105,
			105
		],
		dimgrey: [
			105,
			105,
			105
		],
		dodgerblue: [
			30,
			144,
			255
		],
		firebrick: [
			178,
			34,
			34
		],
		floralwhite: [
			255,
			250,
			240
		],
		forestgreen: [
			34,
			139,
			34
		],
		fuchsia: [
			255,
			0,
			255
		],
		gainsboro: [
			220,
			220,
			220
		],
		ghostwhite: [
			248,
			248,
			255
		],
		gold: [
			255,
			215,
			0
		],
		goldenrod: [
			218,
			165,
			32
		],
		gray: [
			128,
			128,
			128
		],
		green: [
			0,
			128,
			0
		],
		greenyellow: [
			173,
			255,
			47
		],
		grey: [
			128,
			128,
			128
		],
		honeydew: [
			240,
			255,
			240
		],
		hotpink: [
			255,
			105,
			180
		],
		indianred: [
			205,
			92,
			92
		],
		indigo: [
			75,
			0,
			130
		],
		ivory: [
			255,
			255,
			240
		],
		khaki: [
			240,
			230,
			140
		],
		lavender: [
			230,
			230,
			250
		],
		lavenderblush: [
			255,
			240,
			245
		],
		lawngreen: [
			124,
			252,
			0
		],
		lemonchiffon: [
			255,
			250,
			205
		],
		lightblue: [
			173,
			216,
			230
		],
		lightcoral: [
			240,
			128,
			128
		],
		lightcyan: [
			224,
			255,
			255
		],
		lightgoldenrodyellow: [
			250,
			250,
			210
		],
		lightgray: [
			211,
			211,
			211
		],
		lightgreen: [
			144,
			238,
			144
		],
		lightgrey: [
			211,
			211,
			211
		],
		lightpink: [
			255,
			182,
			193
		],
		lightsalmon: [
			255,
			160,
			122
		],
		lightseagreen: [
			32,
			178,
			170
		],
		lightskyblue: [
			135,
			206,
			250
		],
		lightslategray: [
			119,
			136,
			153
		],
		lightslategrey: [
			119,
			136,
			153
		],
		lightsteelblue: [
			176,
			196,
			222
		],
		lightyellow: [
			255,
			255,
			224
		],
		lime: [
			0,
			255,
			0
		],
		limegreen: [
			50,
			205,
			50
		],
		linen: [
			250,
			240,
			230
		],
		magenta: [
			255,
			0,
			255
		],
		maroon: [
			128,
			0,
			0
		],
		mediumaquamarine: [
			102,
			205,
			170
		],
		mediumblue: [
			0,
			0,
			205
		],
		mediumorchid: [
			186,
			85,
			211
		],
		mediumpurple: [
			147,
			112,
			219
		],
		mediumseagreen: [
			60,
			179,
			113
		],
		mediumslateblue: [
			123,
			104,
			238
		],
		mediumspringgreen: [
			0,
			250,
			154
		],
		mediumturquoise: [
			72,
			209,
			204
		],
		mediumvioletred: [
			199,
			21,
			133
		],
		midnightblue: [
			25,
			25,
			112
		],
		mintcream: [
			245,
			255,
			250
		],
		mistyrose: [
			255,
			228,
			225
		],
		moccasin: [
			255,
			228,
			181
		],
		navajowhite: [
			255,
			222,
			173
		],
		navy: [
			0,
			0,
			128
		],
		oldlace: [
			253,
			245,
			230
		],
		olive: [
			128,
			128,
			0
		],
		olivedrab: [
			107,
			142,
			35
		],
		orange: [
			255,
			165,
			0
		],
		orangered: [
			255,
			69,
			0
		],
		orchid: [
			218,
			112,
			214
		],
		palegoldenrod: [
			238,
			232,
			170
		],
		palegreen: [
			152,
			251,
			152
		],
		paleturquoise: [
			175,
			238,
			238
		],
		palevioletred: [
			219,
			112,
			147
		],
		papayawhip: [
			255,
			239,
			213
		],
		peachpuff: [
			255,
			218,
			185
		],
		peru: [
			205,
			133,
			63
		],
		pink: [
			255,
			192,
			203
		],
		plum: [
			221,
			160,
			221
		],
		powderblue: [
			176,
			224,
			230
		],
		purple: [
			128,
			0,
			128
		],
		rebeccapurple: [
			102,
			51,
			153
		],
		red: [
			255,
			0,
			0
		],
		rosybrown: [
			188,
			143,
			143
		],
		royalblue: [
			65,
			105,
			225
		],
		saddlebrown: [
			139,
			69,
			19
		],
		salmon: [
			250,
			128,
			114
		],
		sandybrown: [
			244,
			164,
			96
		],
		seagreen: [
			46,
			139,
			87
		],
		seashell: [
			255,
			245,
			238
		],
		sienna: [
			160,
			82,
			45
		],
		silver: [
			192,
			192,
			192
		],
		skyblue: [
			135,
			206,
			235
		],
		slateblue: [
			106,
			90,
			205
		],
		slategray: [
			112,
			128,
			144
		],
		slategrey: [
			112,
			128,
			144
		],
		snow: [
			255,
			250,
			250
		],
		springgreen: [
			0,
			255,
			127
		],
		steelblue: [
			70,
			130,
			180
		],
		tan: [
			210,
			180,
			140
		],
		teal: [
			0,
			128,
			128
		],
		thistle: [
			216,
			191,
			216
		],
		tomato: [
			255,
			99,
			71
		],
		turquoise: [
			64,
			224,
			208
		],
		violet: [
			238,
			130,
			238
		],
		wheat: [
			245,
			222,
			179
		],
		white: [
			255,
			255,
			255
		],
		whitesmoke: [
			245,
			245,
			245
		],
		yellow: [
			255,
			255,
			0
		],
		yellowgreen: [
			154,
			205,
			50
		]
	};
	for (const key in colors) Object.freeze(colors[key]);
	var color_name_default = Object.freeze(colors);
	var reverseNames = /* @__PURE__ */ Object.create(null);
	for (const name in color_name_default) if (Object.hasOwn(color_name_default, name)) reverseNames[color_name_default[name]] = name;
	var cs = {
		to: {},
		get: {}
	};
	cs.get = function(string) {
		const prefix = string.slice(0, 3).toLowerCase();
		let value;
		let model;
		switch (prefix) {
			case "hsl":
				value = cs.get.hsl(string);
				model = "hsl";
				break;
			case "hwb":
				value = cs.get.hwb(string);
				model = "hwb";
				break;
			default:
				value = cs.get.rgb(string);
				model = "rgb";
		}
		if (!value) return null;
		return {
			model,
			value
		};
	};
	cs.get.rgb = function(string) {
		if (!string) return null;
		const abbr = /^#([a-f\d]{3,4})$/i;
		const hex = /^#([a-f\d]{6})([a-f\d]{2})?$/i;
		const rgba = /^rgba?\(\s*([+-]?(?:\d*\.)?\d+(?:e\d+)?)(?=[\s,])\s*(?:,\s*)?([+-]?(?:\d*\.)?\d+(?:e\d+)?)(?=[\s,])\s*(?:,\s*)?([+-]?(?:\d*\.)?\d+(?:e\d+)?)\s*(?:[\s,|/]\s*([+-]?(?:\d*\.)?\d+(?:e\d+)?)(%?)\s*)?\)$/i;
		const per = /^rgba?\(\s*([+-]?[\d.]+)%\s*,?\s*([+-]?[\d.]+)%\s*,?\s*([+-]?[\d.]+)%\s*(?:[\s,|/]\s*([+-]?[\d.]+)(%?)\s*)?\)$/i;
		const keyword = /^(\w+)$/;
		let rgb = [
			0,
			0,
			0,
			1
		];
		let match;
		let i;
		let hexAlpha;
		if (match = string.match(hex)) {
			hexAlpha = match[2];
			match = match[1];
			for (i = 0; i < 3; i++) {
				const i2 = i * 2;
				rgb[i] = Number.parseInt(match.slice(i2, i2 + 2), 16);
			}
			if (hexAlpha) rgb[3] = Number.parseInt(hexAlpha, 16) / 255;
		} else if (match = string.match(abbr)) {
			match = match[1];
			hexAlpha = match[3];
			for (i = 0; i < 3; i++) rgb[i] = Number.parseInt(match[i] + match[i], 16);
			if (hexAlpha) rgb[3] = Number.parseInt(hexAlpha + hexAlpha, 16) / 255;
		} else if (match = string.match(rgba)) {
			for (i = 0; i < 3; i++) rgb[i] = Number.parseFloat(match[i + 1]);
			if (match[4]) rgb[3] = match[5] ? Number.parseFloat(match[4]) * .01 : Number.parseFloat(match[4]);
		} else if (match = string.match(per)) {
			for (i = 0; i < 3; i++) rgb[i] = Math.round(Number.parseFloat(match[i + 1]) * 2.55);
			if (match[4]) rgb[3] = match[5] ? Number.parseFloat(match[4]) * .01 : Number.parseFloat(match[4]);
		} else if (match = string.toLowerCase().match(keyword)) {
			if (match[1] === "transparent") return [
				0,
				0,
				0,
				0
			];
			if (!Object.hasOwn(color_name_default, match[1])) return null;
			rgb = color_name_default[match[1]].slice();
			rgb[3] = 1;
			return rgb;
		} else return null;
		for (i = 0; i < 3; i++) rgb[i] = clamp(rgb[i], 0, 255);
		rgb[3] = clamp(rgb[3], 0, 1);
		return rgb;
	};
	cs.get.hsl = function(string) {
		if (!string) return null;
		const match = string.match(/^hsla?\(\s*([+-]?(?:\d{0,3}\.)?\d+)(?:deg)?\s*,?\s*([+-]?[\d.]+)%\s*,?\s*([+-]?[\d.]+)%\s*(?:[,|/]\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:e[+-]?\d+)?)\s*)?\)$/i);
		if (match) {
			const alpha = Number.parseFloat(match[4]);
			return [
				(Number.parseFloat(match[1]) % 360 + 360) % 360,
				clamp(Number.parseFloat(match[2]), 0, 100),
				clamp(Number.parseFloat(match[3]), 0, 100),
				clamp(Number.isNaN(alpha) ? 1 : alpha, 0, 1)
			];
		}
		return null;
	};
	cs.get.hwb = function(string) {
		if (!string) return null;
		const match = string.match(/^hwb\(\s*([+-]?\d{0,3}(?:\.\d+)?)(?:deg)?\s*[\s,]\s*([+-]?[\d.]+)%\s*[\s,]\s*([+-]?[\d.]+)%\s*(?:[\s,]\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:e[+-]?\d+)?)\s*)?\)$/i);
		if (match) {
			const alpha = Number.parseFloat(match[4]);
			return [
				(Number.parseFloat(match[1]) % 360 + 360) % 360,
				clamp(Number.parseFloat(match[2]), 0, 100),
				clamp(Number.parseFloat(match[3]), 0, 100),
				clamp(Number.isNaN(alpha) ? 1 : alpha, 0, 1)
			];
		}
		return null;
	};
	cs.to.hex = function(...rgba) {
		return "#" + hexDouble(rgba[0]) + hexDouble(rgba[1]) + hexDouble(rgba[2]) + (rgba[3] < 1 ? hexDouble(Math.round(rgba[3] * 255)) : "");
	};
	cs.to.rgb = function(...rgba) {
		return rgba.length < 4 || rgba[3] === 1 ? "rgb(" + Math.round(rgba[0]) + ", " + Math.round(rgba[1]) + ", " + Math.round(rgba[2]) + ")" : "rgba(" + Math.round(rgba[0]) + ", " + Math.round(rgba[1]) + ", " + Math.round(rgba[2]) + ", " + rgba[3] + ")";
	};
	cs.to.rgb.percent = function(...rgba) {
		const r = Math.round(rgba[0] / 255 * 100);
		const g = Math.round(rgba[1] / 255 * 100);
		const b = Math.round(rgba[2] / 255 * 100);
		return rgba.length < 4 || rgba[3] === 1 ? "rgb(" + r + "%, " + g + "%, " + b + "%)" : "rgba(" + r + "%, " + g + "%, " + b + "%, " + rgba[3] + ")";
	};
	cs.to.hsl = function(...hsla) {
		return hsla.length < 4 || hsla[3] === 1 ? "hsl(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%)" : "hsla(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%, " + hsla[3] + ")";
	};
	cs.to.hwb = function(...hwba) {
		let a = "";
		if (hwba.length >= 4 && hwba[3] !== 1) a = ", " + hwba[3];
		return "hwb(" + hwba[0] + ", " + hwba[1] + "%, " + hwba[2] + "%" + a + ")";
	};
	cs.to.keyword = function(...rgb) {
		return reverseNames[rgb.slice(0, 3)];
	};
	function clamp(number_, min, max) {
		return Math.min(Math.max(min, number_), max);
	}
	function hexDouble(number_) {
		const string_ = Math.round(number_).toString(16).toUpperCase();
		return string_.length < 2 ? "0" + string_ : string_;
	}
	var color_string_default = cs;
	var reverseKeywords = {};
	for (const key of Object.keys(color_name_default)) reverseKeywords[color_name_default[key]] = key;
	var convert = {
		rgb: {
			channels: 3,
			labels: "rgb"
		},
		hsl: {
			channels: 3,
			labels: "hsl"
		},
		hsv: {
			channels: 3,
			labels: "hsv"
		},
		hwb: {
			channels: 3,
			labels: "hwb"
		},
		cmyk: {
			channels: 4,
			labels: "cmyk"
		},
		xyz: {
			channels: 3,
			labels: "xyz"
		},
		lab: {
			channels: 3,
			labels: "lab"
		},
		oklab: {
			channels: 3,
			labels: [
				"okl",
				"oka",
				"okb"
			]
		},
		lch: {
			channels: 3,
			labels: "lch"
		},
		oklch: {
			channels: 3,
			labels: [
				"okl",
				"okc",
				"okh"
			]
		},
		hex: {
			channels: 1,
			labels: ["hex"]
		},
		keyword: {
			channels: 1,
			labels: ["keyword"]
		},
		ansi16: {
			channels: 1,
			labels: ["ansi16"]
		},
		ansi256: {
			channels: 1,
			labels: ["ansi256"]
		},
		hcg: {
			channels: 3,
			labels: [
				"h",
				"c",
				"g"
			]
		},
		apple: {
			channels: 3,
			labels: [
				"r16",
				"g16",
				"b16"
			]
		},
		gray: {
			channels: 1,
			labels: ["gray"]
		}
	};
	var conversions_default = convert;
	var LAB_FT = (6 / 29) ** 3;
	function srgbNonlinearTransform(c) {
		const cc = c > .0031308 ? 1.055 * c ** (1 / 2.4) - .055 : c * 12.92;
		return Math.min(Math.max(0, cc), 1);
	}
	function srgbNonlinearTransformInv(c) {
		return c > .04045 ? ((c + .055) / 1.055) ** 2.4 : c / 12.92;
	}
	for (const model of Object.keys(convert)) {
		if (!("channels" in convert[model])) throw new Error("missing channels property: " + model);
		if (!("labels" in convert[model])) throw new Error("missing channel labels property: " + model);
		if (convert[model].labels.length !== convert[model].channels) throw new Error("channel and label counts mismatch: " + model);
		const { channels, labels } = convert[model];
		delete convert[model].channels;
		delete convert[model].labels;
		Object.defineProperty(convert[model], "channels", { value: channels });
		Object.defineProperty(convert[model], "labels", { value: labels });
	}
	convert.rgb.hsl = function(rgb) {
		const r = rgb[0] / 255;
		const g = rgb[1] / 255;
		const b = rgb[2] / 255;
		const min = Math.min(r, g, b);
		const max = Math.max(r, g, b);
		const delta = max - min;
		let h;
		let s;
		switch (max) {
			case min:
				h = 0;
				break;
			case r:
				h = (g - b) / delta;
				break;
			case g:
				h = 2 + (b - r) / delta;
				break;
			case b: h = 4 + (r - g) / delta;
		}
		h = Math.min(h * 60, 360);
		if (h < 0) h += 360;
		const l = (min + max) / 2;
		if (max === min) s = 0;
		else if (l <= .5) s = delta / (max + min);
		else s = delta / (2 - max - min);
		return [
			h,
			s * 100,
			l * 100
		];
	};
	convert.rgb.hsv = function(rgb) {
		let rdif;
		let gdif;
		let bdif;
		let h;
		let s;
		const r = rgb[0] / 255;
		const g = rgb[1] / 255;
		const b = rgb[2] / 255;
		const v = Math.max(r, g, b);
		const diff = v - Math.min(r, g, b);
		const diffc = function(c) {
			return (v - c) / 6 / diff + 1 / 2;
		};
		if (diff === 0) {
			h = 0;
			s = 0;
		} else {
			s = diff / v;
			rdif = diffc(r);
			gdif = diffc(g);
			bdif = diffc(b);
			switch (v) {
				case r:
					h = bdif - gdif;
					break;
				case g:
					h = 1 / 3 + rdif - bdif;
					break;
				case b: h = 2 / 3 + gdif - rdif;
			}
			if (h < 0) h += 1;
			else if (h > 1) h -= 1;
		}
		return [
			h * 360,
			s * 100,
			v * 100
		];
	};
	convert.rgb.hwb = function(rgb) {
		const r = rgb[0];
		const g = rgb[1];
		let b = rgb[2];
		const h = convert.rgb.hsl(rgb)[0];
		const w = 1 / 255 * Math.min(r, Math.min(g, b));
		b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));
		return [
			h,
			w * 100,
			b * 100
		];
	};
	convert.rgb.oklab = function(rgb) {
		const r = srgbNonlinearTransformInv(rgb[0] / 255);
		const g = srgbNonlinearTransformInv(rgb[1] / 255);
		const b = srgbNonlinearTransformInv(rgb[2] / 255);
		const lp = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
		const mp = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
		const sp = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
		const l = .2104542553 * lp + .793617785 * mp - .0040720468 * sp;
		const aa = 1.9779984951 * lp - 2.428592205 * mp + .4505937099 * sp;
		const bb = .0259040371 * lp + .7827717662 * mp - .808675766 * sp;
		return [
			l * 100,
			aa * 100,
			bb * 100
		];
	};
	convert.rgb.cmyk = function(rgb) {
		const r = rgb[0] / 255;
		const g = rgb[1] / 255;
		const b = rgb[2] / 255;
		const k = Math.min(1 - r, 1 - g, 1 - b);
		const c = (1 - r - k) / (1 - k) || 0;
		const m = (1 - g - k) / (1 - k) || 0;
		const y = (1 - b - k) / (1 - k) || 0;
		return [
			c * 100,
			m * 100,
			y * 100,
			k * 100
		];
	};
	function comparativeDistance(x, y) {
		return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
	}
	convert.rgb.keyword = function(rgb) {
		const reversed = reverseKeywords[rgb];
		if (reversed) return reversed;
		let currentClosestDistance = Number.POSITIVE_INFINITY;
		let currentClosestKeyword;
		for (const keyword of Object.keys(color_name_default)) {
			const value = color_name_default[keyword];
			const distance = comparativeDistance(rgb, value);
			if (distance < currentClosestDistance) {
				currentClosestDistance = distance;
				currentClosestKeyword = keyword;
			}
		}
		return currentClosestKeyword;
	};
	convert.keyword.rgb = function(keyword) {
		return [...color_name_default[keyword]];
	};
	convert.rgb.xyz = function(rgb) {
		const r = srgbNonlinearTransformInv(rgb[0] / 255);
		const g = srgbNonlinearTransformInv(rgb[1] / 255);
		const b = srgbNonlinearTransformInv(rgb[2] / 255);
		const x = r * .4124564 + g * .3575761 + b * .1804375;
		const y = r * .2126729 + g * .7151522 + b * .072175;
		const z = r * .0193339 + g * .119192 + b * .9503041;
		return [
			x * 100,
			y * 100,
			z * 100
		];
	};
	convert.rgb.lab = function(rgb) {
		const xyz = convert.rgb.xyz(rgb);
		let x = xyz[0];
		let y = xyz[1];
		let z = xyz[2];
		x /= 95.047;
		y /= 100;
		z /= 108.883;
		x = x > LAB_FT ? x ** (1 / 3) : 7.787 * x + 16 / 116;
		y = y > LAB_FT ? y ** (1 / 3) : 7.787 * y + 16 / 116;
		z = z > LAB_FT ? z ** (1 / 3) : 7.787 * z + 16 / 116;
		return [
			116 * y - 16,
			500 * (x - y),
			200 * (y - z)
		];
	};
	convert.hsl.rgb = function(hsl) {
		const h = hsl[0] / 360;
		const s = hsl[1] / 100;
		const l = hsl[2] / 100;
		let t3;
		let value;
		if (s === 0) {
			value = l * 255;
			return [
				value,
				value,
				value
			];
		}
		const t2 = l < .5 ? l * (1 + s) : l + s - l * s;
		const t1 = 2 * l - t2;
		const rgb = [
			0,
			0,
			0
		];
		for (let i = 0; i < 3; i++) {
			t3 = h + 1 / 3 * -(i - 1);
			if (t3 < 0) t3++;
			if (t3 > 1) t3--;
			if (6 * t3 < 1) value = t1 + (t2 - t1) * 6 * t3;
			else if (2 * t3 < 1) value = t2;
			else if (3 * t3 < 2) value = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
			else value = t1;
			rgb[i] = value * 255;
		}
		return rgb;
	};
	convert.hsl.hsv = function(hsl) {
		const h = hsl[0];
		let s = hsl[1] / 100;
		let l = hsl[2] / 100;
		let smin = s;
		const lmin = Math.max(l, .01);
		l *= 2;
		s *= l <= 1 ? l : 2 - l;
		smin *= lmin <= 1 ? lmin : 2 - lmin;
		const v = (l + s) / 2;
		return [
			h,
			(l === 0 ? 2 * smin / (lmin + smin) : 2 * s / (l + s)) * 100,
			v * 100
		];
	};
	convert.hsv.rgb = function(hsv) {
		const h = hsv[0] / 60;
		const s = hsv[1] / 100;
		let v = hsv[2] / 100;
		const hi = Math.floor(h) % 6;
		const f = h - Math.floor(h);
		const p = 255 * v * (1 - s);
		const q = 255 * v * (1 - s * f);
		const t = 255 * v * (1 - s * (1 - f));
		v *= 255;
		switch (hi) {
			case 0: return [
				v,
				t,
				p
			];
			case 1: return [
				q,
				v,
				p
			];
			case 2: return [
				p,
				v,
				t
			];
			case 3: return [
				p,
				q,
				v
			];
			case 4: return [
				t,
				p,
				v
			];
			case 5: return [
				v,
				p,
				q
			];
		}
	};
	convert.hsv.hsl = function(hsv) {
		const h = hsv[0];
		const s = hsv[1] / 100;
		const v = hsv[2] / 100;
		const vmin = Math.max(v, .01);
		let sl;
		let l;
		l = (2 - s) * v;
		const lmin = (2 - s) * vmin;
		sl = s * vmin;
		sl /= lmin <= 1 ? lmin : 2 - lmin;
		sl = sl || 0;
		l /= 2;
		return [
			h,
			sl * 100,
			l * 100
		];
	};
	convert.hwb.rgb = function(hwb) {
		const h = hwb[0] / 360;
		let wh = hwb[1] / 100;
		let bl = hwb[2] / 100;
		const ratio = wh + bl;
		let f;
		if (ratio > 1) {
			wh /= ratio;
			bl /= ratio;
		}
		const i = Math.floor(6 * h);
		const v = 1 - bl;
		f = 6 * h - i;
		if ((i & 1) !== 0) f = 1 - f;
		const n = wh + f * (v - wh);
		let r;
		let g;
		let b;
		switch (i) {
			default:
			case 6:
			case 0:
				r = v;
				g = n;
				b = wh;
				break;
			case 1:
				r = n;
				g = v;
				b = wh;
				break;
			case 2:
				r = wh;
				g = v;
				b = n;
				break;
			case 3:
				r = wh;
				g = n;
				b = v;
				break;
			case 4:
				r = n;
				g = wh;
				b = v;
				break;
			case 5:
				r = v;
				g = wh;
				b = n;
		}
		return [
			r * 255,
			g * 255,
			b * 255
		];
	};
	convert.cmyk.rgb = function(cmyk) {
		const c = cmyk[0] / 100;
		const m = cmyk[1] / 100;
		const y = cmyk[2] / 100;
		const k = cmyk[3] / 100;
		const r = 1 - Math.min(1, c * (1 - k) + k);
		const g = 1 - Math.min(1, m * (1 - k) + k);
		const b = 1 - Math.min(1, y * (1 - k) + k);
		return [
			r * 255,
			g * 255,
			b * 255
		];
	};
	convert.xyz.rgb = function(xyz) {
		const x = xyz[0] / 100;
		const y = xyz[1] / 100;
		const z = xyz[2] / 100;
		let r;
		let g;
		let b;
		r = x * 3.2404542 + y * -1.5371385 + z * -.4985314;
		g = x * -.969266 + y * 1.8760108 + z * .041556;
		b = x * .0556434 + y * -.2040259 + z * 1.0572252;
		r = srgbNonlinearTransform(r);
		g = srgbNonlinearTransform(g);
		b = srgbNonlinearTransform(b);
		return [
			r * 255,
			g * 255,
			b * 255
		];
	};
	convert.xyz.lab = function(xyz) {
		let x = xyz[0];
		let y = xyz[1];
		let z = xyz[2];
		x /= 95.047;
		y /= 100;
		z /= 108.883;
		x = x > LAB_FT ? x ** (1 / 3) : 7.787 * x + 16 / 116;
		y = y > LAB_FT ? y ** (1 / 3) : 7.787 * y + 16 / 116;
		z = z > LAB_FT ? z ** (1 / 3) : 7.787 * z + 16 / 116;
		return [
			116 * y - 16,
			500 * (x - y),
			200 * (y - z)
		];
	};
	convert.xyz.oklab = function(xyz) {
		const x = xyz[0] / 100;
		const y = xyz[1] / 100;
		const z = xyz[2] / 100;
		const lp = Math.cbrt(.8189330101 * x + .3618667424 * y - .1288597137 * z);
		const mp = Math.cbrt(.0329845436 * x + .9293118715 * y + .0361456387 * z);
		const sp = Math.cbrt(.0482003018 * x + .2643662691 * y + .633851707 * z);
		const l = .2104542553 * lp + .793617785 * mp - .0040720468 * sp;
		const a = 1.9779984951 * lp - 2.428592205 * mp + .4505937099 * sp;
		const b = .0259040371 * lp + .7827717662 * mp - .808675766 * sp;
		return [
			l * 100,
			a * 100,
			b * 100
		];
	};
	convert.oklab.oklch = function(oklab) {
		return convert.lab.lch(oklab);
	};
	convert.oklab.xyz = function(oklab) {
		const ll = oklab[0] / 100;
		const a = oklab[1] / 100;
		const b = oklab[2] / 100;
		const l = (.999999998 * ll + .396337792 * a + .215803758 * b) ** 3;
		const m = (1.000000008 * ll - .105561342 * a - .063854175 * b) ** 3;
		const s = (1.000000055 * ll - .089484182 * a - 1.291485538 * b) ** 3;
		const x = 1.227013851 * l - .55779998 * m + .281256149 * s;
		const y = -.040580178 * l + 1.11225687 * m - .071676679 * s;
		const z = -.076381285 * l - .421481978 * m + 1.58616322 * s;
		return [
			x * 100,
			y * 100,
			z * 100
		];
	};
	convert.oklab.rgb = function(oklab) {
		const ll = oklab[0] / 100;
		const aa = oklab[1] / 100;
		const bb = oklab[2] / 100;
		const l = (ll + .3963377774 * aa + .2158037573 * bb) ** 3;
		const m = (ll - .1055613458 * aa - .0638541728 * bb) ** 3;
		const s = (ll - .0894841775 * aa - 1.291485548 * bb) ** 3;
		const r = srgbNonlinearTransform(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s);
		const g = srgbNonlinearTransform(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s);
		const b = srgbNonlinearTransform(-.0041960863 * l - .7034186147 * m + 1.707614701 * s);
		return [
			r * 255,
			g * 255,
			b * 255
		];
	};
	convert.oklch.oklab = function(oklch) {
		return convert.lch.lab(oklch);
	};
	convert.lab.xyz = function(lab) {
		const l = lab[0];
		const a = lab[1];
		const b = lab[2];
		let x;
		let y;
		let z;
		y = (l + 16) / 116;
		x = a / 500 + y;
		z = y - b / 200;
		const y2 = y ** 3;
		const x2 = x ** 3;
		const z2 = z ** 3;
		y = y2 > LAB_FT ? y2 : (y - 16 / 116) / 7.787;
		x = x2 > LAB_FT ? x2 : (x - 16 / 116) / 7.787;
		z = z2 > LAB_FT ? z2 : (z - 16 / 116) / 7.787;
		x *= 95.047;
		y *= 100;
		z *= 108.883;
		return [
			x,
			y,
			z
		];
	};
	convert.lab.lch = function(lab) {
		const l = lab[0];
		const a = lab[1];
		const b = lab[2];
		let h;
		h = Math.atan2(b, a) * 360 / 2 / Math.PI;
		if (h < 0) h += 360;
		return [
			l,
			Math.sqrt(a * a + b * b),
			h
		];
	};
	convert.lch.lab = function(lch) {
		const l = lch[0];
		const c = lch[1];
		const hr = lch[2] / 360 * 2 * Math.PI;
		return [
			l,
			c * Math.cos(hr),
			c * Math.sin(hr)
		];
	};
	convert.rgb.ansi16 = function(args, saturation = null) {
		const [r, g, b] = args;
		let value = saturation === null ? convert.rgb.hsv(args)[2] : saturation;
		value = Math.round(value / 50);
		if (value === 0) return 30;
		let ansi = 30 + (Math.round(b / 255) << 2 | Math.round(g / 255) << 1 | Math.round(r / 255));
		if (value === 2) ansi += 60;
		return ansi;
	};
	convert.hsv.ansi16 = function(args) {
		return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
	};
	convert.rgb.ansi256 = function(args) {
		const r = args[0];
		const g = args[1];
		const b = args[2];
		if (r >> 4 === g >> 4 && g >> 4 === b >> 4) {
			if (r < 8) return 16;
			if (r > 248) return 231;
			return Math.round((r - 8) / 247 * 24) + 232;
		}
		return 16 + 36 * Math.round(r / 255 * 5) + 6 * Math.round(g / 255 * 5) + Math.round(b / 255 * 5);
	};
	convert.ansi16.rgb = function(args) {
		args = args[0];
		let color = args % 10;
		if (color === 0 || color === 7) {
			if (args > 50) color += 3.5;
			color = color / 10.5 * 255;
			return [
				color,
				color,
				color
			];
		}
		const mult = (Math.trunc(args > 50) + 1) * .5;
		return [
			(color & 1) * mult * 255,
			(color >> 1 & 1) * mult * 255,
			(color >> 2 & 1) * mult * 255
		];
	};
	convert.ansi256.rgb = function(args) {
		args = args[0];
		if (args >= 232) {
			const c = (args - 232) * 10 + 8;
			return [
				c,
				c,
				c
			];
		}
		args -= 16;
		let rem;
		return [
			Math.floor(args / 36) / 5 * 255,
			Math.floor((rem = args % 36) / 6) / 5 * 255,
			rem % 6 / 5 * 255
		];
	};
	convert.rgb.hex = function(args) {
		const string = (((Math.round(args[0]) & 255) << 16) + ((Math.round(args[1]) & 255) << 8) + (Math.round(args[2]) & 255)).toString(16).toUpperCase();
		return "000000".slice(string.length) + string;
	};
	convert.hex.rgb = function(args) {
		const match = args.toString(16).match(/[a-f\d]{6}|[a-f\d]{3}/i);
		if (!match) return [
			0,
			0,
			0
		];
		let colorString = match[0];
		if (match[0].length === 3) colorString = [...colorString].map((char) => char + char).join("");
		const integer = Number.parseInt(colorString, 16);
		return [
			integer >> 16 & 255,
			integer >> 8 & 255,
			integer & 255
		];
	};
	convert.rgb.hcg = function(rgb) {
		const r = rgb[0] / 255;
		const g = rgb[1] / 255;
		const b = rgb[2] / 255;
		const max = Math.max(Math.max(r, g), b);
		const min = Math.min(Math.min(r, g), b);
		const chroma = max - min;
		let hue;
		const grayscale = chroma < 1 ? min / (1 - chroma) : 0;
		if (chroma <= 0) hue = 0;
		else if (max === r) hue = (g - b) / chroma % 6;
		else if (max === g) hue = 2 + (b - r) / chroma;
		else hue = 4 + (r - g) / chroma;
		hue /= 6;
		hue %= 1;
		return [
			hue * 360,
			chroma * 100,
			grayscale * 100
		];
	};
	convert.hsl.hcg = function(hsl) {
		const s = hsl[1] / 100;
		const l = hsl[2] / 100;
		const c = l < .5 ? 2 * s * l : 2 * s * (1 - l);
		let f = 0;
		if (c < 1) f = (l - .5 * c) / (1 - c);
		return [
			hsl[0],
			c * 100,
			f * 100
		];
	};
	convert.hsv.hcg = function(hsv) {
		const s = hsv[1] / 100;
		const v = hsv[2] / 100;
		const c = s * v;
		let f = 0;
		if (c < 1) f = (v - c) / (1 - c);
		return [
			hsv[0],
			c * 100,
			f * 100
		];
	};
	convert.hcg.rgb = function(hcg) {
		const h = hcg[0] / 360;
		const c = hcg[1] / 100;
		const g = hcg[2] / 100;
		if (c === 0) return [
			g * 255,
			g * 255,
			g * 255
		];
		const pure = [
			0,
			0,
			0
		];
		const hi = h % 1 * 6;
		const v = hi % 1;
		const w = 1 - v;
		let mg = 0;
		switch (Math.floor(hi)) {
			case 0:
				pure[0] = 1;
				pure[1] = v;
				pure[2] = 0;
				break;
			case 1:
				pure[0] = w;
				pure[1] = 1;
				pure[2] = 0;
				break;
			case 2:
				pure[0] = 0;
				pure[1] = 1;
				pure[2] = v;
				break;
			case 3:
				pure[0] = 0;
				pure[1] = w;
				pure[2] = 1;
				break;
			case 4:
				pure[0] = v;
				pure[1] = 0;
				pure[2] = 1;
				break;
			default:
				pure[0] = 1;
				pure[1] = 0;
				pure[2] = w;
		}
		mg = (1 - c) * g;
		return [
			(c * pure[0] + mg) * 255,
			(c * pure[1] + mg) * 255,
			(c * pure[2] + mg) * 255
		];
	};
	convert.hcg.hsv = function(hcg) {
		const c = hcg[1] / 100;
		const v = c + hcg[2] / 100 * (1 - c);
		let f = 0;
		if (v > 0) f = c / v;
		return [
			hcg[0],
			f * 100,
			v * 100
		];
	};
	convert.hcg.hsl = function(hcg) {
		const c = hcg[1] / 100;
		const l = hcg[2] / 100 * (1 - c) + .5 * c;
		let s = 0;
		if (l > 0 && l < .5) s = c / (2 * l);
		else if (l >= .5 && l < 1) s = c / (2 * (1 - l));
		return [
			hcg[0],
			s * 100,
			l * 100
		];
	};
	convert.hcg.hwb = function(hcg) {
		const c = hcg[1] / 100;
		const v = c + hcg[2] / 100 * (1 - c);
		return [
			hcg[0],
			(v - c) * 100,
			(1 - v) * 100
		];
	};
	convert.hwb.hcg = function(hwb) {
		const w = hwb[1] / 100;
		const v = 1 - hwb[2] / 100;
		const c = v - w;
		let g = 0;
		if (c < 1) g = (v - c) / (1 - c);
		return [
			hwb[0],
			c * 100,
			g * 100
		];
	};
	convert.apple.rgb = function(apple) {
		return [
			apple[0] / 65535 * 255,
			apple[1] / 65535 * 255,
			apple[2] / 65535 * 255
		];
	};
	convert.rgb.apple = function(rgb) {
		return [
			rgb[0] / 255 * 65535,
			rgb[1] / 255 * 65535,
			rgb[2] / 255 * 65535
		];
	};
	convert.gray.rgb = function(args) {
		return [
			args[0] / 100 * 255,
			args[0] / 100 * 255,
			args[0] / 100 * 255
		];
	};
	convert.gray.hsl = function(args) {
		return [
			0,
			0,
			args[0]
		];
	};
	convert.gray.hsv = convert.gray.hsl;
	convert.gray.hwb = function(gray) {
		return [
			0,
			100,
			gray[0]
		];
	};
	convert.gray.cmyk = function(gray) {
		return [
			0,
			0,
			0,
			gray[0]
		];
	};
	convert.gray.lab = function(gray) {
		return [
			gray[0],
			0,
			0
		];
	};
	convert.gray.hex = function(gray) {
		const value = Math.round(gray[0] / 100 * 255) & 255;
		const string = ((value << 16) + (value << 8) + value).toString(16).toUpperCase();
		return "000000".slice(string.length) + string;
	};
	convert.rgb.gray = function(rgb) {
		return [(rgb[0] + rgb[1] + rgb[2]) / 3 / 255 * 100];
	};
	function buildGraph() {
		const graph = {};
		const models2 = Object.keys(conversions_default);
		for (let { length } = models2, i = 0; i < length; i++) graph[models2[i]] = {
			distance: -1,
			parent: null
		};
		return graph;
	}
	function deriveBFS(fromModel) {
		const graph = buildGraph();
		const queue = [fromModel];
		graph[fromModel].distance = 0;
		while (queue.length > 0) {
			const current = queue.pop();
			const adjacents = Object.keys(conversions_default[current]);
			for (let { length } = adjacents, i = 0; i < length; i++) {
				const adjacent = adjacents[i];
				const node = graph[adjacent];
				if (node.distance === -1) {
					node.distance = graph[current].distance + 1;
					node.parent = current;
					queue.unshift(adjacent);
				}
			}
		}
		return graph;
	}
	function link(from, to) {
		return function(args) {
			return to(from(args));
		};
	}
	function wrapConversion(toModel, graph) {
		const path = [graph[toModel].parent, toModel];
		let fn = conversions_default[graph[toModel].parent][toModel];
		let cur = graph[toModel].parent;
		while (graph[cur].parent) {
			path.unshift(graph[cur].parent);
			fn = link(conversions_default[graph[cur].parent][cur], fn);
			cur = graph[cur].parent;
		}
		fn.conversion = path;
		return fn;
	}
	function route(fromModel) {
		const graph = deriveBFS(fromModel);
		const conversion = {};
		const models2 = Object.keys(graph);
		for (let { length } = models2, i = 0; i < length; i++) {
			const toModel = models2[i];
			if (graph[toModel].parent === null) continue;
			conversion[toModel] = wrapConversion(toModel, graph);
		}
		return conversion;
	}
	var route_default = route;
	var convert2 = {};
	var models = Object.keys(conversions_default);
	function wrapRaw(fn) {
		const wrappedFn = function(...args) {
			const arg0 = args[0];
			if (arg0 === void 0 || arg0 === null) return arg0;
			if (arg0.length > 1) args = arg0;
			return fn(args);
		};
		if ("conversion" in fn) wrappedFn.conversion = fn.conversion;
		return wrappedFn;
	}
	function wrapRounded(fn) {
		const wrappedFn = function(...args) {
			const arg0 = args[0];
			if (arg0 === void 0 || arg0 === null) return arg0;
			if (arg0.length > 1) args = arg0;
			const result = fn(args);
			if (typeof result === "object") for (let { length } = result, i = 0; i < length; i++) result[i] = Math.round(result[i]);
			return result;
		};
		if ("conversion" in fn) wrappedFn.conversion = fn.conversion;
		return wrappedFn;
	}
	for (const fromModel of models) {
		convert2[fromModel] = {};
		Object.defineProperty(convert2[fromModel], "channels", { value: conversions_default[fromModel].channels });
		Object.defineProperty(convert2[fromModel], "labels", { value: conversions_default[fromModel].labels });
		const routes = route_default(fromModel);
		const routeModels = Object.keys(routes);
		for (const toModel of routeModels) {
			const fn = routes[toModel];
			convert2[fromModel][toModel] = wrapRounded(fn);
			convert2[fromModel][toModel].raw = wrapRaw(fn);
		}
	}
	var color_convert_default = convert2;
	var skippedModels = [
		"keyword",
		"gray",
		"hex"
	];
	var hashedModelKeys = {};
	for (const model of Object.keys(color_convert_default)) hashedModelKeys[[...color_convert_default[model].labels].sort().join("")] = model;
	var limiters = {};
	function Color(object, model) {
		if (!(this instanceof Color)) return new Color(object, model);
		if (model && model in skippedModels) model = null;
		if (model && !(model in color_convert_default)) throw new Error("Unknown model: " + model);
		let i;
		let channels;
		if (object == null) {
			this.model = "rgb";
			this.color = [
				0,
				0,
				0
			];
			this.valpha = 1;
		} else if (object instanceof Color) {
			this.model = object.model;
			this.color = [...object.color];
			this.valpha = object.valpha;
		} else if (typeof object === "string") {
			const result = color_string_default.get(object);
			if (result === null) throw new Error("Unable to parse color from string: " + object);
			this.model = result.model;
			channels = color_convert_default[this.model].channels;
			this.color = result.value.slice(0, channels);
			this.valpha = typeof result.value[channels] === "number" ? result.value[channels] : 1;
		} else if (object.length > 0) {
			this.model = model || "rgb";
			channels = color_convert_default[this.model].channels;
			const newArray = Array.prototype.slice.call(object, 0, channels);
			this.color = zeroArray(newArray, channels);
			this.valpha = typeof object[channels] === "number" ? object[channels] : 1;
		} else if (typeof object === "number") {
			this.model = "rgb";
			this.color = [
				object >> 16 & 255,
				object >> 8 & 255,
				object & 255
			];
			this.valpha = 1;
		} else {
			this.valpha = 1;
			const keys = Object.keys(object);
			if ("alpha" in object) {
				keys.splice(keys.indexOf("alpha"), 1);
				this.valpha = typeof object.alpha === "number" ? object.alpha : 0;
			}
			const hashedKeys = keys.sort().join("");
			if (!(hashedKeys in hashedModelKeys)) throw new Error("Unable to parse color from object: " + JSON.stringify(object));
			this.model = hashedModelKeys[hashedKeys];
			const { labels } = color_convert_default[this.model];
			const color = [];
			for (i = 0; i < labels.length; i++) color.push(object[labels[i]]);
			this.color = zeroArray(color);
		}
		if (limiters[this.model]) {
			channels = color_convert_default[this.model].channels;
			for (i = 0; i < channels; i++) {
				const limit = limiters[this.model][i];
				if (limit) this.color[i] = limit(this.color[i]);
			}
		}
		this.valpha = Math.max(0, Math.min(1, this.valpha));
		if (Object.freeze) Object.freeze(this);
	}
	Color.prototype = {
		toString() {
			return this.string();
		},
		toJSON() {
			return this[this.model]();
		},
		string(places) {
			let self = this.model in color_string_default.to ? this : this.rgb();
			self = self.round(typeof places === "number" ? places : 1);
			const arguments_ = self.valpha === 1 ? self.color : [...self.color, this.valpha];
			return color_string_default.to[self.model](...arguments_);
		},
		percentString(places) {
			const self = this.rgb().round(typeof places === "number" ? places : 1);
			const arguments_ = self.valpha === 1 ? self.color : [...self.color, this.valpha];
			return color_string_default.to.rgb.percent(...arguments_);
		},
		array() {
			return this.valpha === 1 ? [...this.color] : [...this.color, this.valpha];
		},
		object() {
			const result = {};
			const { channels } = color_convert_default[this.model];
			const { labels } = color_convert_default[this.model];
			for (let i = 0; i < channels; i++) result[labels[i]] = this.color[i];
			if (this.valpha !== 1) result.alpha = this.valpha;
			return result;
		},
		unitArray() {
			const rgb = this.rgb().color;
			rgb[0] /= 255;
			rgb[1] /= 255;
			rgb[2] /= 255;
			if (this.valpha !== 1) rgb.push(this.valpha);
			return rgb;
		},
		unitObject() {
			const rgb = this.rgb().object();
			rgb.r /= 255;
			rgb.g /= 255;
			rgb.b /= 255;
			if (this.valpha !== 1) rgb.alpha = this.valpha;
			return rgb;
		},
		round(places) {
			places = Math.max(places || 0, 0);
			return new Color([...this.color.map(roundToPlace(places)), this.valpha], this.model);
		},
		alpha(value) {
			if (value !== void 0) return new Color([...this.color, Math.max(0, Math.min(1, value))], this.model);
			return this.valpha;
		},
		red: getset("rgb", 0, maxfn(255)),
		green: getset("rgb", 1, maxfn(255)),
		blue: getset("rgb", 2, maxfn(255)),
		hue: getset([
			"hsl",
			"hsv",
			"hsl",
			"hwb",
			"hcg"
		], 0, (value) => (value % 360 + 360) % 360),
		saturationl: getset("hsl", 1, maxfn(100)),
		lightness: getset("hsl", 2, maxfn(100)),
		saturationv: getset("hsv", 1, maxfn(100)),
		value: getset("hsv", 2, maxfn(100)),
		chroma: getset("hcg", 1, maxfn(100)),
		gray: getset("hcg", 2, maxfn(100)),
		white: getset("hwb", 1, maxfn(100)),
		wblack: getset("hwb", 2, maxfn(100)),
		cyan: getset("cmyk", 0, maxfn(100)),
		magenta: getset("cmyk", 1, maxfn(100)),
		yellow: getset("cmyk", 2, maxfn(100)),
		black: getset("cmyk", 3, maxfn(100)),
		x: getset("xyz", 0, maxfn(95.047)),
		y: getset("xyz", 1, maxfn(100)),
		z: getset("xyz", 2, maxfn(108.833)),
		l: getset("lab", 0, maxfn(100)),
		a: getset("lab", 1),
		b: getset("lab", 2),
		keyword(value) {
			if (value !== void 0) return new Color(value);
			return color_convert_default[this.model].keyword(this.color);
		},
		hex(value) {
			if (value !== void 0) return new Color(value);
			return color_string_default.to.hex(...this.rgb().round().color);
		},
		hexa(value) {
			if (value !== void 0) return new Color(value);
			const rgbArray = this.rgb().round().color;
			let alphaHex = Math.round(this.valpha * 255).toString(16).toUpperCase();
			if (alphaHex.length === 1) alphaHex = "0" + alphaHex;
			return color_string_default.to.hex(...rgbArray) + alphaHex;
		},
		rgbNumber() {
			const rgb = this.rgb().color;
			return (rgb[0] & 255) << 16 | (rgb[1] & 255) << 8 | rgb[2] & 255;
		},
		luminosity() {
			const rgb = this.rgb().color;
			const lum = [];
			for (const [i, element] of rgb.entries()) {
				const chan = element / 255;
				lum[i] = chan <= .04045 ? chan / 12.92 : ((chan + .055) / 1.055) ** 2.4;
			}
			return .2126 * lum[0] + .7152 * lum[1] + .0722 * lum[2];
		},
		contrast(color2) {
			const lum1 = this.luminosity();
			const lum2 = color2.luminosity();
			if (lum1 > lum2) return (lum1 + .05) / (lum2 + .05);
			return (lum2 + .05) / (lum1 + .05);
		},
		level(color2) {
			const contrastRatio = this.contrast(color2);
			if (contrastRatio >= 7) return "AAA";
			return contrastRatio >= 4.5 ? "AA" : "";
		},
		isDark() {
			const rgb = this.rgb().color;
			return (rgb[0] * 2126 + rgb[1] * 7152 + rgb[2] * 722) / 1e4 < 128;
		},
		isLight() {
			return !this.isDark();
		},
		negate() {
			const rgb = this.rgb();
			for (let i = 0; i < 3; i++) rgb.color[i] = 255 - rgb.color[i];
			return rgb;
		},
		lighten(ratio) {
			const hsl = this.hsl();
			hsl.color[2] += hsl.color[2] * ratio;
			return hsl;
		},
		darken(ratio) {
			const hsl = this.hsl();
			hsl.color[2] -= hsl.color[2] * ratio;
			return hsl;
		},
		saturate(ratio) {
			const hsl = this.hsl();
			hsl.color[1] += hsl.color[1] * ratio;
			return hsl;
		},
		desaturate(ratio) {
			const hsl = this.hsl();
			hsl.color[1] -= hsl.color[1] * ratio;
			return hsl;
		},
		whiten(ratio) {
			const hwb = this.hwb();
			hwb.color[1] += hwb.color[1] * ratio;
			return hwb;
		},
		blacken(ratio) {
			const hwb = this.hwb();
			hwb.color[2] += hwb.color[2] * ratio;
			return hwb;
		},
		grayscale() {
			const rgb = this.rgb().color;
			const value = rgb[0] * .3 + rgb[1] * .59 + rgb[2] * .11;
			return Color.rgb(value, value, value);
		},
		fade(ratio) {
			return this.alpha(this.valpha - this.valpha * ratio);
		},
		opaquer(ratio) {
			return this.alpha(this.valpha + this.valpha * ratio);
		},
		rotate(degrees) {
			const hsl = this.hsl();
			let hue = hsl.color[0];
			hue = (hue + degrees) % 360;
			hue = hue < 0 ? 360 + hue : hue;
			hsl.color[0] = hue;
			return hsl;
		},
		mix(mixinColor, weight) {
			if (!mixinColor || !mixinColor.rgb) throw new Error("Argument to \"mix\" was not a Color instance, but rather an instance of " + typeof mixinColor);
			const color1 = mixinColor.rgb();
			const color2 = this.rgb();
			const p = weight === void 0 ? .5 : weight;
			const w = 2 * p - 1;
			const a = color1.alpha() - color2.alpha();
			const w1 = ((w * a === -1 ? w : (w + a) / (1 + w * a)) + 1) / 2;
			const w2 = 1 - w1;
			return Color.rgb(w1 * color1.red() + w2 * color2.red(), w1 * color1.green() + w2 * color2.green(), w1 * color1.blue() + w2 * color2.blue(), color1.alpha() * p + color2.alpha() * (1 - p));
		}
	};
	for (const model of Object.keys(color_convert_default)) {
		if (skippedModels.includes(model)) continue;
		const { channels } = color_convert_default[model];
		Color.prototype[model] = function(...arguments_) {
			if (this.model === model) return new Color(this);
			if (arguments_.length > 0) return new Color(arguments_, model);
			return new Color([...assertArray(color_convert_default[this.model][model].raw(this.color)), this.valpha], model);
		};
		Color[model] = function(...arguments_) {
			let color = arguments_[0];
			if (typeof color === "number") color = zeroArray(arguments_, channels);
			return new Color(color, model);
		};
	}
	function roundTo(number, places) {
		return Number(number.toFixed(places));
	}
	function roundToPlace(places) {
		return function(number) {
			return roundTo(number, places);
		};
	}
	function getset(model, channel, modifier) {
		model = Array.isArray(model) ? model : [model];
		for (const m of model) (limiters[m] ||= [])[channel] = modifier;
		model = model[0];
		return function(value) {
			let result;
			if (value !== void 0) {
				if (modifier) value = modifier(value);
				result = this[model]();
				result.color[channel] = value;
				return result;
			}
			result = this[model]().color[channel];
			if (modifier) result = modifier(result);
			return result;
		};
	}
	function maxfn(max) {
		return function(v) {
			return Math.max(0, Math.min(max, v));
		};
	}
	function assertArray(value) {
		return Array.isArray(value) ? value : [value];
	}
	function zeroArray(array, length) {
		for (let i = 0; i < length; i++) if (typeof array[i] !== "number") array[i] = 0;
		return array;
	}
	var index_default = Color;
}));
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/colour.mjs
var import_colour = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_color().default;
})))(), 1);
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
/**
* Colourspaces.
* @private
*/
var colourspace = {
	multiband: "multiband",
	"b-w": "b-w",
	bw: "b-w",
	cmyk: "cmyk",
	srgb: "srgb"
};
/**
* Tint the image using the provided colour.
* An alpha channel may be present and will be unchanged by the operation.
*
* @example
* const output = await sharp(input)
*   .tint({ r: 255, g: 240, b: 16 })
*   .toBuffer();
*
* @param {string|Object} tint - Parsed by the [color](https://www.npmjs.org/package/color) module.
* @returns {Sharp}
* @throws {Error} Invalid parameter
*/
function tint(tint) {
	this._setBackgroundColourOption("tint", tint);
	return this;
}
/**
* Convert to 8-bit greyscale; 256 shades of grey.
* This is a linear operation. If the input image is in a non-linear colour space such as sRGB, use `gamma()` with `greyscale()` for the best results.
* By default the output image will be web-friendly sRGB and contain three (identical) colour channels.
* This may be overridden by other sharp operations such as `toColourspace('b-w')`,
* which will produce an output image containing one colour channel.
* An alpha channel may be present, and will be unchanged by the operation.
*
* @example
* const output = await sharp(input).greyscale().toBuffer();
*
* @param {Boolean} [greyscale=true]
* @returns {Sharp}
*/
function greyscale(greyscale) {
	this.options.greyscale = is_default.bool(greyscale) ? greyscale : true;
	return this;
}
/**
* Alternative spelling of `greyscale`.
* @param {Boolean} [grayscale=true]
* @returns {Sharp}
*/
function grayscale(grayscale) {
	return this.greyscale(grayscale);
}
/**
* Set the pipeline colourspace.
*
* The input image will be converted to the provided colourspace at the start of the pipeline.
* All operations will use this colourspace before converting to the output colourspace,
* as defined by {@link #tocolourspace toColourspace}.
*
* @since 0.29.0
*
* @example
* // Run pipeline in 16 bits per channel RGB while converting final result to 8 bits per channel sRGB.
* await sharp(input)
*  .pipelineColourspace('rgb16')
*  .toColourspace('srgb')
*  .toFile('16bpc-pipeline-to-8bpc-output.png')
*
* @param {string} [colourspace] - pipeline colourspace e.g. `rgb16`, `scrgb`, `lab`, `grey16` [...](https://www.libvips.org/API/current/enum.Interpretation.html)
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function pipelineColourspace(colourspace) {
	if (!is_default.string(colourspace)) throw is_default.invalidParameterError("colourspace", "string", colourspace);
	this.options.colourspacePipeline = colourspace;
	return this;
}
/**
* Alternative spelling of `pipelineColourspace`.
* @param {string} [colorspace] - pipeline colorspace.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function pipelineColorspace(colorspace) {
	return this.pipelineColourspace(colorspace);
}
/**
* Set the output colourspace.
* By default output image will be web-friendly sRGB, with additional channels interpreted as alpha channels.
*
* @example
* // Output 16 bits per pixel RGB
* await sharp(input)
*  .toColourspace('rgb16')
*  .toFile('16-bpp.png')
*
* @param {string} [colourspace] - output colourspace e.g. `srgb`, `rgb`, `cmyk`, `lab`, `b-w` [...](https://www.libvips.org/API/current/enum.Interpretation.html)
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function toColourspace(colourspace) {
	if (!is_default.string(colourspace)) throw is_default.invalidParameterError("colourspace", "string", colourspace);
	this.options.colourspace = colourspace;
	return this;
}
/**
* Alternative spelling of `toColourspace`.
* @param {string} [colorspace] - output colorspace.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function toColorspace(colorspace) {
	return this.toColourspace(colorspace);
}
/**
* Create a RGBA colour array from a given value.
* @private
* @param {string|Object} value
* @throws {Error} Invalid value
*/
function _getBackgroundColourOption(value) {
	if (is_default.object(value) || is_default.string(value) && value.length >= 3 && value.length <= 200) {
		const colour = (0, import_colour.default)(value);
		const red = colour.red();
		const green = colour.green();
		const blue = colour.blue();
		const alpha = Math.round(colour.alpha() * 255);
		for (const [channel, component] of [
			["red", red],
			["green", green],
			["blue", blue],
			["alpha", alpha]
		]) if (!is_default.number(component)) throw is_default.invalidParameterError(`background.${channel}`, "number", component);
		return [
			red,
			green,
			blue,
			alpha
		];
	} else throw is_default.invalidParameterError("background", "object or string", value);
}
/**
* Update a colour attribute of the this.options Object.
* @private
* @param {string} key
* @param {string|Object} value
* @throws {Error} Invalid value
*/
function _setBackgroundColourOption(key, value) {
	if (is_default.defined(value)) this.options[key] = _getBackgroundColourOption(value);
}
/**
* Decorate the Sharp prototype with colour-related functions.
* @module Sharp
* @private
*/
var colour_default = (Sharp) => {
	Object.assign(Sharp.prototype, {
		tint,
		greyscale,
		grayscale,
		pipelineColourspace,
		pipelineColorspace,
		toColourspace,
		toColorspace,
		_getBackgroundColourOption,
		_setBackgroundColourOption
	});
	Sharp.colourspace = colourspace;
	Sharp.colorspace = colourspace;
};
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/channel.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
/**
* Boolean operations for bandbool.
* @private
*/
var bool = {
	and: "and",
	or: "or",
	eor: "eor"
};
/**
* Remove alpha channels, if any. This is a no-op if the image does not have an alpha channel.
*
* See also {@link /api-operation/#flatten flatten}.
*
* @example
* sharp('rgba.png')
*   .removeAlpha()
*   .toFile('rgb.png', function(err, info) {
*     // rgb.png is a 3 channel image without an alpha channel
*   });
*
* @returns {Sharp}
*/
function removeAlpha() {
	this.options.removeAlpha = true;
	return this;
}
/**
* Ensure the output image has an alpha transparency channel.
* If missing, the added alpha channel will have the specified
* transparency level, defaulting to fully-opaque (1).
* This is a no-op if the image already has an alpha channel.
*
* @since 0.21.2
*
* @example
* // rgba.png will be a 4 channel image with a fully-opaque alpha channel
* await sharp('rgb.jpg')
*   .ensureAlpha()
*   .toFile('rgba.png')
*
* @example
* // rgba is a 4 channel image with a fully-transparent alpha channel
* const rgba = await sharp(rgb)
*   .ensureAlpha(0)
*   .toBuffer();
*
* @param {number} [alpha=1] - alpha transparency level (0=fully-transparent, 1=fully-opaque)
* @returns {Sharp}
* @throws {Error} Invalid alpha transparency level
*/
function ensureAlpha(alpha) {
	if (is_default.defined(alpha)) if (is_default.number(alpha) && is_default.inRange(alpha, 0, 1)) this.options.ensureAlpha = alpha;
	else throw is_default.invalidParameterError("alpha", "number between 0 and 1", alpha);
	else this.options.ensureAlpha = 1;
	return this;
}
/**
* Extract a single channel from a multi-channel image.
*
* The output colourspace will be either `b-w` (8-bit) or `grey16` (16-bit).
*
* @example
* // green.jpg is a greyscale image containing the green channel of the input
* await sharp(input)
*   .extractChannel('green')
*   .toFile('green.jpg');
*
* @example
* // red1 is the red value of the first pixel, red2 the second pixel etc.
* const [red1, red2, ...] = await sharp(input)
*   .extractChannel(0)
*   .raw()
*   .toBuffer();
*
* @param {number|string} channel - zero-indexed channel/band number to extract, or `red`, `green`, `blue` or `alpha`.
* @returns {Sharp}
* @throws {Error} Invalid channel
*/
function extractChannel(channel) {
	const channelMap = {
		red: 0,
		green: 1,
		blue: 2,
		alpha: 3
	};
	if (Object.keys(channelMap).includes(channel)) channel = channelMap[channel];
	if (is_default.integer(channel) && is_default.inRange(channel, 0, 4)) this.options.extractChannel = channel;
	else throw is_default.invalidParameterError("channel", "integer or one of: red, green, blue, alpha", channel);
	return this;
}
/**
* Join one or more channels to the image.
* The meaning of the added channels depends on the output colourspace, set with `toColourspace()`.
* By default the output image will be web-friendly sRGB, with additional channels interpreted as alpha channels.
* Channel ordering follows vips convention:
* - sRGB: 0: Red, 1: Green, 2: Blue, 3: Alpha.
* - CMYK: 0: Magenta, 1: Cyan, 2: Yellow, 3: Black, 4: Alpha.
*
* Buffers may be any of the image formats supported by sharp.
* For raw pixel input, the `options` object should contain a `raw` attribute, which follows the format of the attribute of the same name in the `sharp()` constructor.
*
* @param {Array<string|Buffer>|string|Buffer} images - one or more images (file paths, Buffers).
* @param {Object} options - image options, see `sharp()` constructor.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function joinChannel(images, options) {
	if (Array.isArray(images)) images.forEach(function(image) {
		this.options.joinChannelIn.push(this._createInputDescriptor(image, options));
	}, this);
	else this.options.joinChannelIn.push(this._createInputDescriptor(images, options));
	return this;
}
/**
* Perform a bitwise boolean operation on all input image channels (bands) to produce a single channel output image.
*
* @example
* sharp('3-channel-rgb-input.png')
*   .bandbool(sharp.bool.and)
*   .toFile('1-channel-output.png', function (err, info) {
*     // The output will be a single channel image where each pixel `P = R & G & B`.
*     // If `I(1,1) = [247, 170, 14] = [0b11110111, 0b10101010, 0b00001111]`
*     // then `O(1,1) = 0b11110111 & 0b10101010 & 0b00001111 = 0b00000010 = 2`.
*   });
*
* @param {string} boolOp - one of `and`, `or` or `eor` to perform that bitwise operation, like the C logic operators `&`, `|` and `^` respectively.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function bandbool(boolOp) {
	if (is_default.string(boolOp) && is_default.inArray(boolOp, [
		"and",
		"or",
		"eor"
	])) this.options.bandBoolOp = boolOp;
	else throw is_default.invalidParameterError("boolOp", "one of: and, or, eor", boolOp);
	return this;
}
/**
* Decorate the Sharp prototype with channel-related functions.
* @module Sharp
* @private
*/
var channel_default = (Sharp) => {
	Object.assign(Sharp.prototype, {
		removeAlpha,
		ensureAlpha,
		extractChannel,
		joinChannel,
		bandbool
	});
	Sharp.bool = bool;
};
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/output.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
var formats = /* @__PURE__ */ new Map([
	["heic", "heif"],
	["heif", "heif"],
	["avif", "avif"],
	["jpeg", "jpeg"],
	["jpg", "jpeg"],
	["jpe", "jpeg"],
	["tile", "tile"],
	["dz", "tile"],
	["png", "png"],
	["raw", "raw"],
	["tiff", "tiff"],
	["tif", "tiff"],
	["webp", "webp"],
	["gif", "gif"],
	["jp2", "jp2"],
	["jpx", "jp2"],
	["j2k", "jp2"],
	["j2c", "jp2"],
	["jxl", "jxl"]
]);
var jp2Regex = /\.(jp[2x]|j2[kc])$/i;
var errJp2Save = () => /* @__PURE__ */ new Error("JP2 output requires libvips with support for OpenJPEG");
var bitdepthFromColourCount = (colours) => 1 << 31 - Math.clz32(Math.ceil(Math.log2(colours)));
/**
* Write output image data to a file.
*
* If an explicit output format is not selected, it will be inferred from the extension,
* with JPEG, PNG, WebP, AVIF, TIFF, GIF, DZI, and libvips' V format supported.
* Note that raw pixel data is only supported for buffer output.
*
* By default all metadata will be removed, which includes EXIF-based orientation.
* See {@link #withmetadata withMetadata} for control over this.
*
* The caller is responsible for ensuring directory structures and permissions exist.
*
* A `Promise` is returned when `callback` is not provided.
*
* @example
* sharp(input)
*   .toFile('output.png', (err, info) => { ... });
*
* @example
* sharp(input)
*   .toFile('output.png')
*   .then(info => { ... })
*   .catch(err => { ... });
*
* @param {string} fileOut - the path to write the image data to.
* @param {Function} [callback] - called on completion with two arguments `(err, info)`.
* `info` contains the output image `format`, `size` (bytes), `width`, `height`,
* `channels` and `premultiplied` (indicating if premultiplication was used).
* When using a crop strategy also contains `cropOffsetLeft` and `cropOffsetTop`.
* When using the attention crop strategy also contains `attentionX` and `attentionY`, the focal point of the cropped region.
* Animated output will also contain `pageHeight` and `pages`.
* May also contain `textAutofitDpi` (dpi the font was rendered at) if image was created from text.
* @returns {Promise<Object>} - when no callback is provided
* @throws {Error} Invalid parameters
*/
function toFile(fileOut, callback) {
	let err;
	if (!is_default.string(fileOut)) err = /* @__PURE__ */ new Error("Missing output file path");
	else if (is_default.string(this.options.input.file) && path.resolve(this.options.input.file) === path.resolve(fileOut)) err = /* @__PURE__ */ new Error("Cannot use same file for input and output");
	else if (jp2Regex.test(path.extname(fileOut)) && !this.constructor.format.jp2.output.file) err = errJp2Save();
	if (err) if (is_default.fn(callback)) callback(err);
	else return Promise.reject(err);
	else {
		this.options.fileOut = fileOut;
		const stack = Error();
		return this._pipeline(callback, stack);
	}
	return this;
}
/**
* Write output to a Buffer.
* JPEG, PNG, WebP, AVIF, TIFF, GIF and raw pixel data output are supported.
*
* Use {@link #toformat toFormat} or one of the format-specific functions such as {@link #jpeg jpeg}, {@link #png png} etc. to set the output format.
*
* If no explicit format is set, the output format will match the input image, except SVG input which becomes PNG output.
*
* By default all metadata will be removed, which includes EXIF-based orientation.
* See {@link #withmetadata withMetadata} for control over this.
*
* `callback`, if present, gets three arguments `(err, data, info)` where:
* - `err` is an error, if any.
* - `data` is the output image data.
* - `info` contains the output image `format`, `size` (bytes), `width`, `height`,
* `channels` and `premultiplied` (indicating if premultiplication was used).
* When using a crop strategy also contains `cropOffsetLeft` and `cropOffsetTop`.
* Animated output will also contain `pageHeight` and `pages`.
* May also contain `textAutofitDpi` (dpi the font was rendered at) if image was created from text.
*
* The underlying `ArrayBuffer` may be marked as non-transferable by some JavaScript runtimes.
* Use {@link #touint8array toUint8Array} for a guaranteed transferable `ArrayBuffer`.
*
* A `Promise` is returned when `callback` is not provided.
*
* @example
* const data = await sharp(input)
*   .png()
*   .toBuffer();
*
* @example
* const { data, info } = await sharp(input)
*   .png()
*   .toBuffer({ resolveWithObject: true });
*
* @example
* const { data, info } = await sharp('my-image.jpg')
*   // output the raw pixels
*   .raw()
*   .toBuffer({ resolveWithObject: true });
*
* // create a more type safe way to work with the raw pixel data
* // this will not copy the data, instead it will change `data`s underlying ArrayBuffer
* // so `data` and `pixelArray` point to the same memory location
* const pixelArray = new Uint8ClampedArray(data.buffer);
*
* // When you are done changing the pixelArray, sharp takes the `pixelArray` as an input
* const { width, height, channels } = info;
* await sharp(pixelArray, { raw: { width, height, channels } })
*   .toFile('my-changed-image.jpg');
*
* @param {Object} [options]
* @param {boolean} [options.resolveWithObject] Resolve the Promise with an Object containing `data` and `info` properties instead of resolving only with `data`.
* @param {Function} [callback]
* @returns {Promise<Buffer>} - when no callback is provided
*/
function toBuffer(options, callback) {
	if (is_default.object(options)) this._setBooleanOption("resolveWithObject", options.resolveWithObject);
	else if (this.options.resolveWithObject) this.options.resolveWithObject = false;
	this.options.fileOut = "";
	const stack = Error();
	return this._pipeline(is_default.fn(options) ? options : callback, stack);
}
/**
* Write output to a `Uint8Array` backed by a transferable `ArrayBuffer`.
* JPEG, PNG, WebP, AVIF, TIFF, GIF and raw pixel data output are supported.
*
* Use {@link #toformat toFormat} or one of the format-specific functions such as {@link #jpeg jpeg}, {@link #png png} etc. to set the output format.
*
* If no explicit format is set, the output format will match the input image, except SVG input which becomes PNG output.
*
* By default all metadata will be removed, which includes EXIF-based orientation.
* See {@link #keepexif keepExif} and similar methods for control over this.
*
* Resolves with an `Object` containing:
* - `data` is the output image as a `Uint8Array` backed by a transferable `ArrayBuffer`.
* - `info` contains properties relating to the output image such as `width` and `height`.
*
* @since v0.35.0
*
* @example
* const { data, info } = await sharp(input).toUint8Array();
*
* @example
* const { data } = await sharp(input)
*   .avif()
*   .toUint8Array();
* const base64String = data.toBase64();
*
* @returns {Promise<{ data: Uint8Array, info: Object }>}
*/
function toUint8Array() {
	this.options.resolveWithObject = true;
	this.options.typedArrayOut = true;
	const stack = Error();
	return this._pipeline(null, stack);
}
/**
* Set output density (DPI) in EXIF metadata.
*
* @since 0.35.0
*
* @example
* const data = await sharp(input)
*   .withDensity(96)
*   .toBuffer();
*
* @param {number} density Number of pixels per inch (DPI).
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function withDensity(density) {
	if (is_default.number(density) && density > 0) this.options.withMetadataDensity = density;
	else throw is_default.invalidParameterError("density", "positive number", density);
	return this.keepExif();
}
/**
* Keep all EXIF metadata from the input image in the output image.
*
* EXIF metadata is unsupported for TIFF output.
*
* @since 0.33.0
*
* @example
* const outputWithExif = await sharp(inputWithExif)
*   .keepExif()
*   .toBuffer();
*
* @returns {Sharp}
*/
function keepExif() {
	this.options.keepMetadata |= 1;
	return this;
}
/**
* Set EXIF metadata in the output image, ignoring any EXIF in the input image.
*
* @since 0.33.0
*
* @example
* const dataWithExif = await sharp(input)
*   .withExif({
*     IFD0: {
*       Copyright: 'The National Gallery'
*     },
*     IFD3: {
*       GPSLatitudeRef: 'N',
*       GPSLatitude: '51/1 30/1 3230/100',
*       GPSLongitudeRef: 'W',
*       GPSLongitude: '0/1 7/1 4366/100'
*     }
*   })
*   .toBuffer();
*
* @param {Object<string, Object<string, string>>} exif Object keyed by IFD0, IFD1 etc. of key/value string pairs to write as EXIF data.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function withExif(exif) {
	if (is_default.object(exif)) for (const [ifd, entries] of Object.entries(exif)) if (is_default.object(entries)) for (const [k, v] of Object.entries(entries)) if (is_default.string(v)) this.options.withExif[`exif-${ifd.toLowerCase()}-${k}`] = v;
	else throw is_default.invalidParameterError(`${ifd}.${k}`, "string", v);
	else throw is_default.invalidParameterError(ifd, "object", entries);
	else throw is_default.invalidParameterError("exif", "object", exif);
	this.options.withExifMerge = false;
	return this.keepExif();
}
/**
* Update EXIF metadata from the input image in the output image.
*
* @since 0.33.0
*
* @example
* const dataWithMergedExif = await sharp(inputWithExif)
*   .withExifMerge({
*     IFD0: {
*       Copyright: 'The National Gallery'
*     }
*   })
*   .toBuffer();
*
* @param {Object<string, Object<string, string>>} exif Object keyed by IFD0, IFD1 etc. of key/value string pairs to write as EXIF data.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function withExifMerge(exif) {
	this.withExif(exif);
	this.options.withExifMerge = true;
	return this;
}
/**
* Keep ICC profile from the input image in the output image.
*
* When input and output colour spaces differ, use with {@link /api-colour/#tocolourspace toColourspace} and optionally {@link /api-colour/#pipelinecolourspace pipelineColourspace}.
*
* @since 0.33.0
*
* @example
* const outputWithIccProfile = await sharp(inputWithIccProfile)
*   .keepIccProfile()
*   .toBuffer();
*
* @example
* const cmykOutputWithIccProfile = await sharp(cmykInputWithIccProfile)
*   .pipelineColourspace('cmyk')
*   .toColourspace('cmyk')
*   .keepIccProfile()
*   .toBuffer();
*
* @returns {Sharp}
*/
function keepIccProfile() {
	this.options.keepMetadata |= 8;
	return this;
}
/**
* Transform using an ICC profile and attach to the output image.
*
* This can either be an absolute filesystem path or
* built-in profile name (`srgb`, `p3`, `cmyk`).
*
* @since 0.33.0
*
* @example
* const outputWithP3 = await sharp(input)
*   .withIccProfile('p3')
*   .toBuffer();
*
* @param {string} icc - Absolute filesystem path to output ICC profile or built-in profile name (srgb, p3, cmyk).
* @param {Object} [options]
* @param {number} [options.attach=true] Should the ICC profile be included in the output image metadata?
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function withIccProfile(icc, options) {
	if (is_default.string(icc)) this.options.withIccProfile = icc;
	else throw is_default.invalidParameterError("icc", "string", icc);
	this.keepIccProfile();
	if (is_default.object(options)) {
		if (is_default.defined(options.attach)) if (is_default.bool(options.attach)) {
			if (!options.attach) this.options.keepMetadata &= -9;
		} else throw is_default.invalidParameterError("attach", "boolean", options.attach);
	}
	return this;
}
/**
* If the input contains gain map metadata, attempt to process the image and gain map separately,
* recombining them into a single output image.
*
* This approach is faster and should produce better results than {@link #withgainmap withGainMap},
* however not all operations are supported.
*
* Only JPEG input and output are supported.
* JPEG output options other than `quality` are ignored.
*
* This feature is experimental and the API may change.
*
* @since 0.35.0
*
* @example
* const outputWithResizedGainMap = await sharp(inputWithGainMap)
*   .keepGainMap()
*   .resize({ width: 64 })
*   .toBuffer();
*
* @returns {Sharp}
*/
function keepGainMap() {
	this.options.keepGainMap = true;
	this.options.withGainMap = false;
	this.options.keepMetadata |= 32;
	return this;
}
/**
* If the input contains gain map metadata, use it to convert the main image to HDR (High Dynamic Range) before further processing.
* The input gain map is discarded.
*
* If the output is JPEG, generate and attach a new ISO 21496-1 gain map.
* JPEG output options other than `quality` are ignored.
*
* This feature is experimental and the API may change.
*
* @since 0.35.0
*
* @example
* const outputWithRegeneratedGainMap = await sharp(inputWithGainMap)
*   .withGainMap()
*   .toBuffer();
*
* @returns {Sharp}
*/
function withGainMap() {
	this.options.withGainMap = true;
	this.options.keepGainMap = false;
	this.options.colourspace = "scrgb";
	return this;
}
/**
* Keep XMP metadata from the input image in the output image.
*
* @since 0.34.3
*
* @example
* const outputWithXmp = await sharp(inputWithXmp)
*   .keepXmp()
*   .toBuffer();
*
* @returns {Sharp}
*/
function keepXmp() {
	this.options.keepMetadata |= 2;
	return this;
}
/**
* Set XMP metadata in the output image.
*
* Supported by PNG, JPEG, WebP, and TIFF output.
*
* @since 0.34.3
*
* @example
* const xmpString = `
*   <?xml version="1.0"?>
*   <x:xmpmeta xmlns:x="adobe:ns:meta/">
*     <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
*       <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
*         <dc:creator><rdf:Seq><rdf:li>John Doe</rdf:li></rdf:Seq></dc:creator>
*       </rdf:Description>
*     </rdf:RDF>
*   </x:xmpmeta>`;
*
* const data = await sharp(input)
*   .withXmp(xmpString)
*   .toBuffer();
*
* @param {string} xmp String containing XMP metadata to be embedded in the output image.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function withXmp(xmp) {
	if (is_default.string(xmp) && xmp.length > 0) {
		this.options.withXmp = xmp;
		this.options.keepMetadata |= 2;
	} else throw is_default.invalidParameterError("xmp", "non-empty string", xmp);
	return this;
}
/**
* Keep all metadata (EXIF, ICC, XMP, IPTC) from the input image in the output image.
*
* The default behaviour, when `keepMetadata` is not used, is to convert to the device-independent
* sRGB colour space and strip all metadata, including the removal of any ICC profile.
*
* @since 0.33.0
*
* @example
* const outputWithMetadata = await sharp(inputWithMetadata)
*   .keepMetadata()
*   .toBuffer();
*
* @returns {Sharp}
*/
function keepMetadata() {
	this.options.keepMetadata |= 31;
	return this;
}
/**
* Keep most metadata (EXIF, XMP, IPTC) from the input image in the output image.
*
* This will also convert to and add a web-friendly sRGB ICC profile if appropriate.
*
* Allows orientation and density to be set or updated.
*
* @example
* const outputSrgbWithMetadata = await sharp(inputRgbWithMetadata)
*   .withMetadata()
*   .toBuffer();
*
* @example
* // Set output metadata to 96 DPI
* const data = await sharp(input)
*   .withMetadata({ density: 96 })
*   .toBuffer();
*
* @param {Object} [options]
* @param {number} [options.orientation] Used to update the EXIF `Orientation` tag, integer between 1 and 8.
* @param {number} [options.density] Number of pixels per inch (DPI).
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function withMetadata(options) {
	this.keepMetadata();
	this.withIccProfile("srgb");
	if (is_default.object(options)) {
		if (is_default.defined(options.orientation)) if (is_default.integer(options.orientation) && is_default.inRange(options.orientation, 1, 8)) this.options.withMetadataOrientation = options.orientation;
		else throw is_default.invalidParameterError("orientation", "integer between 1 and 8", options.orientation);
		if (is_default.defined(options.density)) if (is_default.number(options.density) && options.density > 0) this.options.withMetadataDensity = options.density;
		else throw is_default.invalidParameterError("density", "positive number", options.density);
		if (is_default.defined(options.icc)) this.withIccProfile(options.icc);
		if (is_default.defined(options.exif)) this.withExifMerge(options.exif);
	}
	return this;
}
/**
* Force output to a given format.
*
* @example
* // Convert any input to PNG output
* const data = await sharp(input)
*   .toFormat('png')
*   .toBuffer();
*
* @param {(string|Object)} format - as a string or an Object with an 'id' attribute
* @param {Object} options - output options
* @returns {Sharp}
* @throws {Error} unsupported format or options
*/
function toFormat(format, options) {
	const actualFormat = formats.get((is_default.object(format) && is_default.string(format.id) ? format.id : format).toLowerCase());
	if (!actualFormat) throw is_default.invalidParameterError("format", `one of: ${[...formats.keys()].join(", ")}`, format);
	return this[actualFormat](options);
}
/**
* Use these JPEG options for output image.
*
* @example
* // Convert any input to very high quality JPEG output
* const data = await sharp(input)
*   .jpeg({
*     quality: 100,
*     chromaSubsampling: '4:4:4'
*   })
*   .toBuffer();
*
* @example
* // Use mozjpeg to reduce output JPEG file size (slower)
* const data = await sharp(input)
*   .jpeg({ mozjpeg: true })
*   .toBuffer();
*
* @param {Object} [options] - output options
* @param {number} [options.quality=80] - quality, integer 1-100
* @param {boolean} [options.progressive=false] - use progressive (interlace) scan
* @param {string} [options.chromaSubsampling='4:2:0'] - set to '4:4:4' to prevent chroma subsampling otherwise defaults to '4:2:0' chroma subsampling
* @param {boolean} [options.optimiseCoding=true] - optimise Huffman coding tables
* @param {boolean} [options.optimizeCoding=true] - alternative spelling of optimiseCoding
* @param {boolean} [options.mozjpeg=false] - use mozjpeg defaults, equivalent to `{ trellisQuantisation: true, overshootDeringing: true, optimiseScans: true, quantisationTable: 3 }`
* @param {boolean} [options.trellisQuantisation=false] - apply trellis quantisation
* @param {boolean} [options.overshootDeringing=false] - apply overshoot deringing
* @param {boolean} [options.optimiseScans=false] - optimise progressive scans, forces progressive
* @param {boolean} [options.optimizeScans=false] - alternative spelling of optimiseScans
* @param {number} [options.quantisationTable=0] - quantization table to use, integer 0-8
* @param {number} [options.quantizationTable=0] - alternative spelling of quantisationTable
* @param {boolean} [options.force=true] - force JPEG output, otherwise attempt to use input format
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function jpeg(options) {
	if (is_default.object(options)) {
		if (is_default.defined(options.quality)) if (is_default.integer(options.quality) && is_default.inRange(options.quality, 1, 100)) this.options.jpegQuality = options.quality;
		else throw is_default.invalidParameterError("quality", "integer between 1 and 100", options.quality);
		if (is_default.defined(options.progressive)) this._setBooleanOption("jpegProgressive", options.progressive);
		if (is_default.defined(options.chromaSubsampling)) if (is_default.string(options.chromaSubsampling) && is_default.inArray(options.chromaSubsampling, ["4:2:0", "4:4:4"])) this.options.jpegChromaSubsampling = options.chromaSubsampling;
		else throw is_default.invalidParameterError("chromaSubsampling", "one of: 4:2:0, 4:4:4", options.chromaSubsampling);
		const optimiseCoding = is_default.bool(options.optimizeCoding) ? options.optimizeCoding : options.optimiseCoding;
		if (is_default.defined(optimiseCoding)) this._setBooleanOption("jpegOptimiseCoding", optimiseCoding);
		if (is_default.defined(options.mozjpeg)) if (is_default.bool(options.mozjpeg)) {
			if (options.mozjpeg) {
				this.options.jpegTrellisQuantisation = true;
				this.options.jpegOvershootDeringing = true;
				this.options.jpegOptimiseScans = true;
				this.options.jpegProgressive = true;
				this.options.jpegQuantisationTable = 3;
			}
		} else throw is_default.invalidParameterError("mozjpeg", "boolean", options.mozjpeg);
		const trellisQuantisation = is_default.bool(options.trellisQuantization) ? options.trellisQuantization : options.trellisQuantisation;
		if (is_default.defined(trellisQuantisation)) this._setBooleanOption("jpegTrellisQuantisation", trellisQuantisation);
		if (is_default.defined(options.overshootDeringing)) this._setBooleanOption("jpegOvershootDeringing", options.overshootDeringing);
		const optimiseScans = is_default.bool(options.optimizeScans) ? options.optimizeScans : options.optimiseScans;
		if (is_default.defined(optimiseScans)) {
			this._setBooleanOption("jpegOptimiseScans", optimiseScans);
			if (optimiseScans) this.options.jpegProgressive = true;
		}
		const quantisationTable = is_default.number(options.quantizationTable) ? options.quantizationTable : options.quantisationTable;
		if (is_default.defined(quantisationTable)) if (is_default.integer(quantisationTable) && is_default.inRange(quantisationTable, 0, 8)) this.options.jpegQuantisationTable = quantisationTable;
		else throw is_default.invalidParameterError("quantisationTable", "integer between 0 and 8", quantisationTable);
	}
	return this._updateFormatOut("jpeg", options);
}
/**
* Use these PNG options for output image.
*
* By default, PNG output is full colour at 8 bits per pixel.
*
* Indexed PNG input at 1, 2 or 4 bits per pixel is converted to 8 bits per pixel.
* Set `palette` to `true` for slower, indexed PNG output.
*
* For 16 bits per pixel output, convert to `rgb16` via
* {@link /api-colour/#tocolourspace toColourspace}.
*
* @example
* // Convert any input to full colour PNG output
* const data = await sharp(input)
*   .png()
*   .toBuffer();
*
* @example
* // Convert any input to indexed PNG output (slower)
* const data = await sharp(input)
*   .png({ palette: true })
*   .toBuffer();
*
* @example
* // Output 16 bits per pixel RGB(A)
* const data = await sharp(input)
*  .toColourspace('rgb16')
*  .png()
*  .toBuffer();
*
* @param {Object} [options]
* @param {boolean} [options.progressive=false] - use progressive (interlace) scan
* @param {number} [options.compressionLevel=6] - zlib compression level, 0 (fastest, largest) to 9 (slowest, smallest)
* @param {boolean} [options.adaptiveFiltering=false] - use adaptive row filtering
* @param {boolean} [options.palette=false] - quantise to a palette-based image with alpha transparency support
* @param {number} [options.quality=100] - use the lowest number of colours needed to achieve given quality, sets `palette` to `true`
* @param {number} [options.effort=7] - CPU effort, between 1 (fastest) and 10 (slowest), sets `palette` to `true`
* @param {number} [options.colours=256] - maximum number of palette entries, sets `palette` to `true`
* @param {number} [options.colors=256] - alternative spelling of `options.colours`, sets `palette` to `true`
* @param {number} [options.dither=1.0] - level of Floyd-Steinberg error diffusion, sets `palette` to `true`
* @param {boolean} [options.force=true] - force PNG output, otherwise attempt to use input format
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function png(options) {
	if (is_default.object(options)) {
		if (is_default.defined(options.progressive)) this._setBooleanOption("pngProgressive", options.progressive);
		if (is_default.defined(options.compressionLevel)) if (is_default.integer(options.compressionLevel) && is_default.inRange(options.compressionLevel, 0, 9)) this.options.pngCompressionLevel = options.compressionLevel;
		else throw is_default.invalidParameterError("compressionLevel", "integer between 0 and 9", options.compressionLevel);
		if (is_default.defined(options.adaptiveFiltering)) this._setBooleanOption("pngAdaptiveFiltering", options.adaptiveFiltering);
		const colours = options.colours || options.colors;
		if (is_default.defined(colours)) if (is_default.integer(colours) && is_default.inRange(colours, 2, 256)) this.options.pngBitdepth = bitdepthFromColourCount(colours);
		else throw is_default.invalidParameterError("colours", "integer between 2 and 256", colours);
		if (is_default.defined(options.palette)) this._setBooleanOption("pngPalette", options.palette);
		else if ([
			options.quality,
			options.effort,
			options.colours,
			options.colors,
			options.dither
		].some(is_default.defined)) this._setBooleanOption("pngPalette", true);
		if (this.options.pngPalette) {
			if (is_default.defined(options.quality)) if (is_default.integer(options.quality) && is_default.inRange(options.quality, 0, 100)) this.options.pngQuality = options.quality;
			else throw is_default.invalidParameterError("quality", "integer between 0 and 100", options.quality);
			if (is_default.defined(options.effort)) if (is_default.integer(options.effort) && is_default.inRange(options.effort, 1, 10)) this.options.pngEffort = options.effort;
			else throw is_default.invalidParameterError("effort", "integer between 1 and 10", options.effort);
			if (is_default.defined(options.dither)) if (is_default.number(options.dither) && is_default.inRange(options.dither, 0, 1)) this.options.pngDither = options.dither;
			else throw is_default.invalidParameterError("dither", "number between 0.0 and 1.0", options.dither);
		}
	}
	return this._updateFormatOut("png", options);
}
/**
* Use these WebP options for output image.
*
* @example
* // Convert any input to lossless WebP output
* const data = await sharp(input)
*   .webp({ lossless: true })
*   .toBuffer();
*
* @example
* // Optimise the file size of an animated WebP
* const outputWebp = await sharp(inputWebp, { animated: true })
*   .webp({ effort: 6 })
*   .toBuffer();
*
* @param {Object} [options] - output options
* @param {number} [options.quality=80] - quality, integer 1-100
* @param {number} [options.alphaQuality=100] - quality of alpha layer, integer 0-100
* @param {boolean} [options.lossless=false] - use lossless compression mode
* @param {boolean} [options.nearLossless=false] - use near_lossless compression mode
* @param {boolean} [options.smartSubsample=false] - use high quality chroma subsampling
* @param {boolean} [options.smartDeblock=false] - auto-adjust the deblocking filter, can improve low contrast edges (slow)
* @param {string} [options.preset='default'] - named preset for preprocessing/filtering, one of: default, photo, picture, drawing, icon, text
* @param {number} [options.effort=4] - CPU effort, between 0 (fastest) and 6 (slowest)
* @param {number} [options.loop=0] - number of animation iterations, use 0 for infinite animation
* @param {number|number[]} [options.delay] - delay(s) between animation frames (in milliseconds)
* @param {boolean} [options.minSize=false] - prevent use of animation key frames to minimise file size (slow)
* @param {boolean} [options.mixed=false] - allow mixture of lossy and lossless animation frames (slow)
* @param {boolean} [options.exact=false] - preserve the colour data in transparent pixels
* @param {boolean} [options.force=true] - force WebP output, otherwise attempt to use input format
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function webp(options) {
	if (is_default.object(options)) {
		if (is_default.defined(options.quality)) if (is_default.integer(options.quality) && is_default.inRange(options.quality, 1, 100)) this.options.webpQuality = options.quality;
		else throw is_default.invalidParameterError("quality", "integer between 1 and 100", options.quality);
		if (is_default.defined(options.alphaQuality)) if (is_default.integer(options.alphaQuality) && is_default.inRange(options.alphaQuality, 0, 100)) this.options.webpAlphaQuality = options.alphaQuality;
		else throw is_default.invalidParameterError("alphaQuality", "integer between 0 and 100", options.alphaQuality);
		if (is_default.defined(options.lossless)) this._setBooleanOption("webpLossless", options.lossless);
		if (is_default.defined(options.nearLossless)) this._setBooleanOption("webpNearLossless", options.nearLossless);
		if (is_default.defined(options.smartSubsample)) this._setBooleanOption("webpSmartSubsample", options.smartSubsample);
		if (is_default.defined(options.smartDeblock)) this._setBooleanOption("webpSmartDeblock", options.smartDeblock);
		if (is_default.defined(options.preset)) if (is_default.string(options.preset) && is_default.inArray(options.preset, [
			"default",
			"photo",
			"picture",
			"drawing",
			"icon",
			"text"
		])) this.options.webpPreset = options.preset;
		else throw is_default.invalidParameterError("preset", "one of: default, photo, picture, drawing, icon, text", options.preset);
		if (is_default.defined(options.effort)) if (is_default.integer(options.effort) && is_default.inRange(options.effort, 0, 6)) this.options.webpEffort = options.effort;
		else throw is_default.invalidParameterError("effort", "integer between 0 and 6", options.effort);
		if (is_default.defined(options.minSize)) this._setBooleanOption("webpMinSize", options.minSize);
		if (is_default.defined(options.mixed)) this._setBooleanOption("webpMixed", options.mixed);
		if (is_default.defined(options.exact)) this._setBooleanOption("webpExact", options.exact);
	}
	trySetAnimationOptions(options, this.options);
	return this._updateFormatOut("webp", options);
}
/**
* Use these GIF options for the output image.
*
* The first entry in the palette is reserved for transparency.
*
* The palette of the input image will be re-used if possible.
*
* @since 0.30.0
*
* @example
* // Convert PNG to GIF
* await sharp(pngBuffer)
*   .gif()
*   .toBuffer();
*
* @example
* // Convert animated WebP to animated GIF
* await sharp('animated.webp', { animated: true })
*   .toFile('animated.gif');
*
* @example
* // Create a 128x128, cropped, non-dithered, animated thumbnail of an animated GIF
* const out = await sharp('in.gif', { animated: true })
*   .resize({ width: 128, height: 128 })
*   .gif({ dither: 0 })
*   .toBuffer();
*
* @example
* // Lossy file size reduction of animated GIF
* await sharp('in.gif', { animated: true })
*   .gif({ interFrameMaxError: 8 })
*   .toFile('optim.gif');
*
* @param {Object} [options] - output options
* @param {boolean} [options.reuse=true] - re-use existing palette, otherwise generate new (slow)
* @param {boolean} [options.progressive=false] - use progressive (interlace) scan
* @param {number} [options.colours=256] - maximum number of palette entries, including transparency, between 2 and 256
* @param {number} [options.colors=256] - alternative spelling of `options.colours`
* @param {number} [options.effort=7] - CPU effort, between 1 (fastest) and 10 (slowest)
* @param {number} [options.dither=1.0] - level of Floyd-Steinberg error diffusion, between 0 (least) and 1 (most)
* @param {number} [options.interFrameMaxError=0] - maximum inter-frame error for transparency, between 0 (lossless) and 32
* @param {number} [options.interPaletteMaxError=3] - maximum inter-palette error for palette reuse, between 0 and 256
* @param {boolean} [options.keepDuplicateFrames=false] - keep duplicate frames in the output instead of combining them
* @param {number} [options.loop=0] - number of animation iterations, use 0 for infinite animation
* @param {number|number[]} [options.delay] - delay(s) between animation frames (in milliseconds)
* @param {boolean} [options.force=true] - force GIF output, otherwise attempt to use input format
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function gif(options) {
	if (is_default.object(options)) {
		if (is_default.defined(options.reuse)) this._setBooleanOption("gifReuse", options.reuse);
		if (is_default.defined(options.progressive)) this._setBooleanOption("gifProgressive", options.progressive);
		const colours = options.colours || options.colors;
		if (is_default.defined(colours)) if (is_default.integer(colours) && is_default.inRange(colours, 2, 256)) this.options.gifBitdepth = bitdepthFromColourCount(colours);
		else throw is_default.invalidParameterError("colours", "integer between 2 and 256", colours);
		if (is_default.defined(options.effort)) if (is_default.integer(options.effort) && is_default.inRange(options.effort, 1, 10)) this.options.gifEffort = options.effort;
		else throw is_default.invalidParameterError("effort", "integer between 1 and 10", options.effort);
		if (is_default.defined(options.dither)) if (is_default.number(options.dither) && is_default.inRange(options.dither, 0, 1)) this.options.gifDither = options.dither;
		else throw is_default.invalidParameterError("dither", "number between 0.0 and 1.0", options.dither);
		if (is_default.defined(options.interFrameMaxError)) if (is_default.number(options.interFrameMaxError) && is_default.inRange(options.interFrameMaxError, 0, 32)) this.options.gifInterFrameMaxError = options.interFrameMaxError;
		else throw is_default.invalidParameterError("interFrameMaxError", "number between 0.0 and 32.0", options.interFrameMaxError);
		if (is_default.defined(options.interPaletteMaxError)) if (is_default.number(options.interPaletteMaxError) && is_default.inRange(options.interPaletteMaxError, 0, 256)) this.options.gifInterPaletteMaxError = options.interPaletteMaxError;
		else throw is_default.invalidParameterError("interPaletteMaxError", "number between 0.0 and 256.0", options.interPaletteMaxError);
		if (is_default.defined(options.keepDuplicateFrames)) if (is_default.bool(options.keepDuplicateFrames)) this._setBooleanOption("gifKeepDuplicateFrames", options.keepDuplicateFrames);
		else throw is_default.invalidParameterError("keepDuplicateFrames", "boolean", options.keepDuplicateFrames);
	}
	trySetAnimationOptions(options, this.options);
	return this._updateFormatOut("gif", options);
}
/**
* Use these JP2 options for output image.
*
* Requires libvips compiled with support for OpenJPEG.
* The prebuilt binaries do not include this - see
* {@link /install#custom-libvips installing a custom libvips}.
*
* @example
* // Convert any input to lossless JP2 output
* const data = await sharp(input)
*   .jp2({ lossless: true })
*   .toBuffer();
*
* @example
* // Convert any input to very high quality JP2 output
* const data = await sharp(input)
*   .jp2({
*     quality: 100,
*     chromaSubsampling: '4:4:4'
*   })
*   .toBuffer();
*
* @since 0.29.1
*
* @param {Object} [options] - output options
* @param {number} [options.quality=80] - quality, integer 1-100
* @param {boolean} [options.lossless=false] - use lossless compression mode
* @param {number} [options.tileWidth=512] - horizontal tile size
* @param {number} [options.tileHeight=512] - vertical tile size
* @param {string} [options.chromaSubsampling='4:4:4'] - set to '4:2:0' to use chroma subsampling
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function jp2(options) {
	/* node:coverage ignore next 41 */
	if (!this.constructor.format.jp2.output.buffer) throw errJp2Save();
	if (is_default.object(options)) {
		if (is_default.defined(options.quality)) if (is_default.integer(options.quality) && is_default.inRange(options.quality, 1, 100)) this.options.jp2Quality = options.quality;
		else throw is_default.invalidParameterError("quality", "integer between 1 and 100", options.quality);
		if (is_default.defined(options.lossless)) if (is_default.bool(options.lossless)) this.options.jp2Lossless = options.lossless;
		else throw is_default.invalidParameterError("lossless", "boolean", options.lossless);
		if (is_default.defined(options.tileWidth)) if (is_default.integer(options.tileWidth) && is_default.inRange(options.tileWidth, 1, 32768)) this.options.jp2TileWidth = options.tileWidth;
		else throw is_default.invalidParameterError("tileWidth", "integer between 1 and 32768", options.tileWidth);
		if (is_default.defined(options.tileHeight)) if (is_default.integer(options.tileHeight) && is_default.inRange(options.tileHeight, 1, 32768)) this.options.jp2TileHeight = options.tileHeight;
		else throw is_default.invalidParameterError("tileHeight", "integer between 1 and 32768", options.tileHeight);
		if (is_default.defined(options.chromaSubsampling)) if (is_default.string(options.chromaSubsampling) && is_default.inArray(options.chromaSubsampling, ["4:2:0", "4:4:4"])) this.options.jp2ChromaSubsampling = options.chromaSubsampling;
		else throw is_default.invalidParameterError("chromaSubsampling", "one of: 4:2:0, 4:4:4", options.chromaSubsampling);
	}
	return this._updateFormatOut("jp2", options);
}
/**
* Set animation options if available.
* @private
*
* @param {Object} [source] - output options
* @param {number} [source.loop=0] - number of animation iterations, use 0 for infinite animation
* @param {number[]} [source.delay] - list of delays between animation frames (in milliseconds)
* @param {Object} [target] - target object for valid options
* @throws {Error} Invalid options
*/
function trySetAnimationOptions(source, target) {
	if (is_default.object(source) && is_default.defined(source.loop)) if (is_default.integer(source.loop) && is_default.inRange(source.loop, 0, 65535)) target.loop = source.loop;
	else throw is_default.invalidParameterError("loop", "integer between 0 and 65535", source.loop);
	if (is_default.object(source) && is_default.defined(source.delay)) if (is_default.integer(source.delay) && is_default.inRange(source.delay, 0, 65535)) target.delay = [source.delay];
	else if (Array.isArray(source.delay) && source.delay.every(is_default.integer) && source.delay.every((v) => is_default.inRange(v, 0, 65535))) target.delay = source.delay;
	else throw is_default.invalidParameterError("delay", "integer or an array of integers between 0 and 65535", source.delay);
}
/**
* Use these TIFF options for output image.
*
* The `density` can be set in pixels/inch via {@link #withmetadata withMetadata}
* instead of providing `xres` and `yres` in pixels/mm.
*
* @example
* // Convert SVG input to LZW-compressed, 1 bit per pixel TIFF output
* sharp('input.svg')
*   .tiff({
*     compression: 'lzw',
*     bitdepth: 1
*   })
*   .toFile('1-bpp-output.tiff')
*   .then(info => { ... });
*
* @param {Object} [options] - output options
* @param {number} [options.quality=80] - quality, integer 1-100
* @param {boolean} [options.force=true] - force TIFF output, otherwise attempt to use input format
* @param {string} [options.compression='jpeg'] - compression options: none, jpeg, deflate, packbits, ccittfax4, lzw, webp, zstd, jp2k
* @param {boolean} [options.bigtiff=false] - use BigTIFF variant (has no effect when compression is none)
* @param {string} [options.predictor='horizontal'] - compression predictor options: none, horizontal, float
* @param {boolean} [options.pyramid=false] - write an image pyramid
* @param {boolean} [options.tile=false] - write a tiled tiff
* @param {number} [options.tileWidth=256] - horizontal tile size, valid values are integers in the range 1-32768
* @param {number} [options.tileHeight=256] - vertical tile size, valid values are integers in the range 1-32768
* @param {number} [options.xres=1.0] - horizontal resolution in pixels/mm, valid values are numbers in the range 0.001-1000000
* @param {number} [options.yres=1.0] - vertical resolution in pixels/mm, valid values are numbers in the range 0.001-1000000
* @param {string} [options.resolutionUnit='inch'] - resolution unit options: inch, cm
* @param {number} [options.bitdepth=0] - reduce bitdepth to 1, 2 or 4 bit
* @param {boolean} [options.miniswhite=false] - write 1-bit images as miniswhite
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function tiff(options) {
	if (is_default.object(options)) {
		if (is_default.defined(options.quality)) if (is_default.integer(options.quality) && is_default.inRange(options.quality, 1, 100)) this.options.tiffQuality = options.quality;
		else throw is_default.invalidParameterError("quality", "integer between 1 and 100", options.quality);
		if (is_default.defined(options.bitdepth)) if (is_default.integer(options.bitdepth) && is_default.inArray(options.bitdepth, [
			1,
			2,
			4
		])) this.options.tiffBitdepth = options.bitdepth;
		else throw is_default.invalidParameterError("bitdepth", "1, 2 or 4", options.bitdepth);
		if (is_default.defined(options.tile)) this._setBooleanOption("tiffTile", options.tile);
		if (is_default.defined(options.tileWidth)) if (is_default.integer(options.tileWidth) && is_default.inRange(options.tileWidth, 1, 32768)) this.options.tiffTileWidth = options.tileWidth;
		else throw is_default.invalidParameterError("tileWidth", "integer between 1 and 32768", options.tileWidth);
		if (is_default.defined(options.tileHeight)) if (is_default.integer(options.tileHeight) && is_default.inRange(options.tileHeight, 1, 32768)) this.options.tiffTileHeight = options.tileHeight;
		else throw is_default.invalidParameterError("tileHeight", "integer between 1 and 32768", options.tileHeight);
		if (is_default.defined(options.miniswhite)) this._setBooleanOption("tiffMiniswhite", options.miniswhite);
		if (is_default.defined(options.pyramid)) this._setBooleanOption("tiffPyramid", options.pyramid);
		if (is_default.defined(options.xres)) if (is_default.number(options.xres) && is_default.inRange(options.xres, .001, 1e6)) this.options.tiffXres = options.xres;
		else throw is_default.invalidParameterError("xres", "number between 0.001 and 1000000", options.xres);
		if (is_default.defined(options.yres)) if (is_default.number(options.yres) && is_default.inRange(options.yres, .001, 1e6)) this.options.tiffYres = options.yres;
		else throw is_default.invalidParameterError("yres", "number between 0.001 and 1000000", options.yres);
		if (is_default.defined(options.compression)) if (is_default.string(options.compression) && is_default.inArray(options.compression, [
			"none",
			"jpeg",
			"deflate",
			"packbits",
			"ccittfax4",
			"lzw",
			"webp",
			"zstd",
			"jp2k"
		])) this.options.tiffCompression = options.compression;
		else throw is_default.invalidParameterError("compression", "one of: none, jpeg, deflate, packbits, ccittfax4, lzw, webp, zstd, jp2k", options.compression);
		if (is_default.defined(options.bigtiff)) this._setBooleanOption("tiffBigtiff", options.bigtiff);
		if (is_default.defined(options.predictor)) if (is_default.string(options.predictor) && is_default.inArray(options.predictor, [
			"none",
			"horizontal",
			"float"
		])) this.options.tiffPredictor = options.predictor;
		else throw is_default.invalidParameterError("predictor", "one of: none, horizontal, float", options.predictor);
		if (is_default.defined(options.resolutionUnit)) if (is_default.string(options.resolutionUnit) && is_default.inArray(options.resolutionUnit, ["inch", "cm"])) this.options.tiffResolutionUnit = options.resolutionUnit;
		else throw is_default.invalidParameterError("resolutionUnit", "one of: inch, cm", options.resolutionUnit);
	}
	return this._updateFormatOut("tiff", options);
}
/**
* Use these AVIF options for output image.
*
* AVIF image sequences are not supported.
*
* @example
* const data = await sharp(input)
*   .avif({ effort: 2 })
*   .toBuffer();
*
* @example
* const data = await sharp(input)
*   .avif({ lossless: true })
*   .toBuffer();
*
* @since 0.27.0
*
* @param {Object} [options] - output options
* @param {number} [options.quality=50] - quality, integer 1-100
* @param {boolean} [options.lossless=false] - use lossless compression
* @param {number} [options.effort=4] - CPU effort, between 0 (fastest) and 9 (slowest)
* @param {string} [options.chromaSubsampling='4:4:4'] - set to '4:2:0' to use chroma subsampling
* @param {number} [options.bitdepth=8] - set bitdepth to 8, 10 or 12 bit
* @param {string} [options.tune='auto'] - tune output for a quality metric, one of 'auto' (default), 'iq', 'psnr' or 'ssim'
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function avif(options) {
	return this.heif({
		...options,
		compression: "av1"
	});
}
/**
* Use these HEIF options for output image.
*
* Support for patent-encumbered HEIC images using `hevc` compression requires the use of a
* globally-installed libvips compiled with support for libheif, libde265 and x265.
*
* @example
* const data = await sharp(input)
*   .heif({ compression: 'hevc' })
*   .toBuffer();
*
* @since 0.23.0
*
* @param {Object} options - output options
* @param {string} options.compression - compression format: av1, hevc
* @param {number} [options.quality=50] - quality, integer 1-100
* @param {boolean} [options.lossless=false] - use lossless compression
* @param {number} [options.effort=4] - CPU effort, between 0 (fastest) and 9 (slowest)
* @param {string} [options.chromaSubsampling='4:4:4'] - set to '4:2:0' to use chroma subsampling
* @param {number} [options.bitdepth=8] - set bitdepth to 8, 10 or 12 bit
* @param {string} [options.tune='auto'] - tune output for a quality metric, one of 'auto' (default), 'iq', 'psnr' or 'ssim'
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function heif(options) {
	if (is_default.object(options)) {
		if (is_default.string(options.compression) && is_default.inArray(options.compression, ["av1", "hevc"])) this.options.heifCompression = options.compression;
		else throw is_default.invalidParameterError("compression", "one of: av1, hevc", options.compression);
		if (is_default.defined(options.quality)) if (is_default.integer(options.quality) && is_default.inRange(options.quality, 1, 100)) this.options.heifQuality = options.quality;
		else throw is_default.invalidParameterError("quality", "integer between 1 and 100", options.quality);
		if (is_default.defined(options.lossless)) if (is_default.bool(options.lossless)) this.options.heifLossless = options.lossless;
		else throw is_default.invalidParameterError("lossless", "boolean", options.lossless);
		if (is_default.defined(options.effort)) if (is_default.integer(options.effort) && is_default.inRange(options.effort, 0, 9)) this.options.heifEffort = options.effort;
		else throw is_default.invalidParameterError("effort", "integer between 0 and 9", options.effort);
		if (is_default.defined(options.chromaSubsampling)) if (is_default.string(options.chromaSubsampling) && is_default.inArray(options.chromaSubsampling, ["4:2:0", "4:4:4"])) this.options.heifChromaSubsampling = options.chromaSubsampling;
		else throw is_default.invalidParameterError("chromaSubsampling", "one of: 4:2:0, 4:4:4", options.chromaSubsampling);
		if (is_default.defined(options.bitdepth)) if (is_default.integer(options.bitdepth) && is_default.inArray(options.bitdepth, [
			8,
			10,
			12
		])) this.options.heifBitdepth = options.bitdepth;
		else throw is_default.invalidParameterError("bitdepth", "8, 10 or 12", options.bitdepth);
		if (is_default.defined(options.tune)) if (is_default.string(options.tune) && is_default.inArray(options.tune, [
			"auto",
			"iq",
			"psnr",
			"ssim"
		])) if (this.options.heifLossless && options.tune === "iq") this.options.heifTune = "ssim";
		else this.options.heifTune = options.tune;
		else throw is_default.invalidParameterError("tune", "one of: auto, iq, psnr, ssim", options.tune);
	} else throw is_default.invalidParameterError("options", "Object", options);
	return this._updateFormatOut("heif", options);
}
/**
* Use these JPEG-XL (JXL) options for output image.
*
* This feature is experimental, please do not use in production systems.
*
* Requires libvips compiled with support for libjxl.
* The prebuilt binaries do not include this - see
* {@link /install/#custom-libvips installing a custom libvips}.
*
* @since 0.31.3
*
* @param {Object} [options] - output options
* @param {number} [options.distance=1.0] - maximum encoding error, between 0 (highest quality) and 15 (lowest quality)
* @param {number} [options.quality] - calculate `distance` based on JPEG-like quality, between 1 and 100, overrides distance if specified
* @param {number} [options.decodingTier=0] - target decode speed tier, between 0 (highest quality) and 4 (lowest quality)
* @param {boolean} [options.lossless=false] - use lossless compression
* @param {number} [options.effort=7] - CPU effort, between 1 (fastest) and 9 (slowest)
* @param {number} [options.loop=0] - number of animation iterations, use 0 for infinite animation
* @param {number|number[]} [options.delay] - delay(s) between animation frames (in milliseconds)
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function jxl(options) {
	if (is_default.object(options)) {
		if (is_default.defined(options.quality)) if (is_default.integer(options.quality) && is_default.inRange(options.quality, 1, 100)) this.options.jxlDistance = options.quality >= 30 ? .1 + (100 - options.quality) * .09 : 53 / 3e3 * options.quality * options.quality - 23 / 20 * options.quality + 25;
		else throw is_default.invalidParameterError("quality", "integer between 1 and 100", options.quality);
		else if (is_default.defined(options.distance)) if (is_default.number(options.distance) && is_default.inRange(options.distance, 0, 15)) this.options.jxlDistance = options.distance;
		else throw is_default.invalidParameterError("distance", "number between 0.0 and 15.0", options.distance);
		if (is_default.defined(options.decodingTier)) if (is_default.integer(options.decodingTier) && is_default.inRange(options.decodingTier, 0, 4)) this.options.jxlDecodingTier = options.decodingTier;
		else throw is_default.invalidParameterError("decodingTier", "integer between 0 and 4", options.decodingTier);
		if (is_default.defined(options.lossless)) if (is_default.bool(options.lossless)) this.options.jxlLossless = options.lossless;
		else throw is_default.invalidParameterError("lossless", "boolean", options.lossless);
		if (is_default.defined(options.effort)) if (is_default.integer(options.effort) && is_default.inRange(options.effort, 1, 9)) this.options.jxlEffort = options.effort;
		else throw is_default.invalidParameterError("effort", "integer between 1 and 9", options.effort);
	}
	trySetAnimationOptions(options, this.options);
	return this._updateFormatOut("jxl", options);
}
/**
* Force output to be raw, uncompressed pixel data.
* Pixel ordering is left-to-right, top-to-bottom, without padding.
* Channel ordering will be RGB or RGBA for non-greyscale colourspaces.
*
* @example
* // Extract raw, unsigned 8-bit RGB pixel data from JPEG input
* const { data, info } = await sharp('input.jpg')
*   .raw()
*   .toBuffer({ resolveWithObject: true });
*
* @example
* // Extract alpha channel as raw, unsigned 16-bit pixel data from PNG input
* const data = await sharp('input.png')
*   .ensureAlpha()
*   .extractChannel(3)
*   .toColourspace('b-w')
*   .raw({ depth: 'ushort' })
*   .toBuffer();
*
* @param {Object} [options] - output options
* @param {string} [options.depth='uchar'] - bit depth, one of: char, uchar (default), short, ushort, int, uint, float, complex, double, dpcomplex
* @returns {Sharp}
* @throws {Error} Invalid options
*/
function raw(options) {
	if (is_default.object(options)) {
		if (is_default.defined(options.depth)) if (is_default.string(options.depth) && is_default.inArray(options.depth, [
			"char",
			"uchar",
			"short",
			"ushort",
			"int",
			"uint",
			"float",
			"complex",
			"double",
			"dpcomplex"
		])) this.options.rawDepth = options.depth;
		else throw is_default.invalidParameterError("depth", "one of: char, uchar, short, ushort, int, uint, float, complex, double, dpcomplex", options.depth);
	}
	return this._updateFormatOut("raw");
}
/**
* Use tile-based deep zoom (image pyramid) output.
*
* Set the format and options for tile images via the `toFormat`, `jpeg`, `png` or `webp` functions.
* Use a `.zip` or `.szi` file extension with `toFile` to write to a compressed archive file format.
*
* The container will be set to `zip` when the output is a Buffer or Stream, otherwise it will default to `fs`.
*
* @example
*  sharp('input.tiff')
*   .png()
*   .tile({
*     size: 512
*   })
*   .toFile('output.dz', function(err, info) {
*     // output.dzi is the Deep Zoom XML definition
*     // output_files contains 512x512 tiles grouped by zoom level
*   });
*
* @example
* const zipFileWithTiles = await sharp(input)
*   .tile({ basename: "tiles" })
*   .toBuffer();
*
* @example
* const iiififier = sharp().tile({ layout: "iiif" });
* readableStream
*   .pipe(iiififier)
*   .pipe(writeableStream);
*
* @param {Object} [options]
* @param {number} [options.size=256] tile size in pixels, a value between 1 and 8192.
* @param {number} [options.overlap=0] tile overlap in pixels, a value between 0 and 8192.
* @param {number} [options.angle=0] tile angle of rotation, must be a multiple of 90.
* @param {string|Object} [options.background={r: 255, g: 255, b: 255, alpha: 1}] - background colour, parsed by the [color](https://www.npmjs.org/package/color) module, defaults to white without transparency.
* @param {string} [options.depth] how deep to make the pyramid, possible values are `onepixel`, `onetile` or `one`, default based on layout.
* @param {number} [options.skipBlanks=-1] Threshold to skip tile generation. Range is 0-255 for 8-bit images, 0-65535 for 16-bit images. Default is 5 for `google` layout, -1 (no skip) otherwise.
* @param {string} [options.container='fs'] tile container, with value `fs` (filesystem) or `zip` (compressed file).
* @param {string} [options.layout='dz'] filesystem layout, possible values are `dz`, `iiif`, `iiif3`, `zoomify` or `google`.
* @param {boolean} [options.centre=false] centre image in tile.
* @param {boolean} [options.center=false] alternative spelling of centre.
* @param {string} [options.id='https://example.com/iiif'] when `layout` is `iiif`/`iiif3`, sets the `@id`/`id` attribute of `info.json`
* @param {string} [options.basename] the name of the directory within the zip file when container is `zip`.
* @returns {Sharp}
* @throws {Error} Invalid parameters
*/
function tile(options) {
	if (is_default.object(options)) {
		if (is_default.defined(options.size)) if (is_default.integer(options.size) && is_default.inRange(options.size, 1, 8192)) this.options.tileSize = options.size;
		else throw is_default.invalidParameterError("size", "integer between 1 and 8192", options.size);
		if (is_default.defined(options.overlap)) if (is_default.integer(options.overlap) && is_default.inRange(options.overlap, 0, 8192)) {
			if (options.overlap > this.options.tileSize) throw is_default.invalidParameterError("overlap", `<= size (${this.options.tileSize})`, options.overlap);
			this.options.tileOverlap = options.overlap;
		} else throw is_default.invalidParameterError("overlap", "integer between 0 and 8192", options.overlap);
		if (is_default.defined(options.container)) if (is_default.string(options.container) && is_default.inArray(options.container, ["fs", "zip"])) this.options.tileContainer = options.container;
		else throw is_default.invalidParameterError("container", "one of: fs, zip", options.container);
		if (is_default.defined(options.layout)) if (is_default.string(options.layout) && is_default.inArray(options.layout, [
			"dz",
			"google",
			"iiif",
			"iiif3",
			"zoomify"
		])) this.options.tileLayout = options.layout;
		else throw is_default.invalidParameterError("layout", "one of: dz, google, iiif, iiif3, zoomify", options.layout);
		if (is_default.defined(options.angle)) if (is_default.integer(options.angle) && !(options.angle % 90)) this.options.tileAngle = options.angle;
		else throw is_default.invalidParameterError("angle", "positive/negative multiple of 90", options.angle);
		this._setBackgroundColourOption("tileBackground", options.background);
		if (is_default.defined(options.depth)) if (is_default.string(options.depth) && is_default.inArray(options.depth, [
			"onepixel",
			"onetile",
			"one"
		])) this.options.tileDepth = options.depth;
		else throw is_default.invalidParameterError("depth", "one of: onepixel, onetile, one", options.depth);
		if (is_default.defined(options.skipBlanks)) if (is_default.integer(options.skipBlanks) && is_default.inRange(options.skipBlanks, -1, 65535)) this.options.tileSkipBlanks = options.skipBlanks;
		else throw is_default.invalidParameterError("skipBlanks", "integer between -1 and 255/65535", options.skipBlanks);
		else if (is_default.defined(options.layout) && options.layout === "google") this.options.tileSkipBlanks = 5;
		const centre = is_default.bool(options.center) ? options.center : options.centre;
		if (is_default.defined(centre)) this._setBooleanOption("tileCentre", centre);
		if (is_default.defined(options.id)) if (is_default.string(options.id)) this.options.tileId = options.id;
		else throw is_default.invalidParameterError("id", "string", options.id);
		if (is_default.defined(options.basename)) if (is_default.string(options.basename)) this.options.tileBasename = options.basename;
		else throw is_default.invalidParameterError("basename", "string", options.basename);
	}
	if (is_default.inArray(this.options.formatOut, [
		"jpeg",
		"png",
		"webp"
	])) this.options.tileFormat = this.options.formatOut;
	else if (this.options.formatOut !== "input") throw is_default.invalidParameterError("format", "one of: jpeg, png, webp", this.options.formatOut);
	return this._updateFormatOut("dz");
}
/**
* Set a timeout for processing, in seconds.
* Use a value of zero to continue processing indefinitely, the default behaviour.
*
* The clock starts when libvips opens an input image for processing.
* Time spent waiting for a libuv thread to become available is not included.
*
* @example
* // Ensure processing takes no longer than 3 seconds
* try {
*   const data = await sharp(input)
*     .blur(1000)
*     .timeout({ seconds: 3 })
*     .toBuffer();
* } catch (err) {
*   if (err.message.includes('timeout')) { ... }
* }
*
* @since 0.29.2
*
* @param {Object} options
* @param {number} options.seconds - Number of seconds after which processing will be stopped
* @returns {Sharp}
*/
function timeout(options) {
	if (!is_default.plainObject(options)) throw is_default.invalidParameterError("options", "object", options);
	if (is_default.integer(options.seconds) && is_default.inRange(options.seconds, 0, 3600)) this.options.timeoutSeconds = options.seconds;
	else throw is_default.invalidParameterError("seconds", "integer between 0 and 3600", options.seconds);
	return this;
}
/**
* Update the output format unless options.force is false,
* in which case revert to input format.
* @private
* @param {string} formatOut
* @param {Object} [options]
* @param {boolean} [options.force=true] - force output format, otherwise attempt to use input format
* @returns {Sharp}
*/
function _updateFormatOut(formatOut, options) {
	if (!(is_default.object(options) && options.force === false)) this.options.formatOut = formatOut;
	return this;
}
/**
* Update a boolean attribute of the this.options Object.
* @private
* @param {string} key
* @param {boolean} val
* @throws {Error} Invalid key
*/
function _setBooleanOption(key, val) {
	if (is_default.bool(val)) this.options[key] = val;
	else throw is_default.invalidParameterError(key, "boolean", val);
}
/**
* Called by a WriteableStream to notify us it is ready for data.
* @private
*/
function _read() {
	if (!this.options.streamOut) {
		this.options.streamOut = true;
		const stack = Error();
		this._pipeline(void 0, stack);
	}
}
/**
* Invoke the C++ image processing pipeline
* Supports callback, stream and promise variants
* @private
*/
function _pipeline(callback, stack) {
	if (typeof callback === "function") {
		if (this._isStreamInput()) this.on("finish", () => {
			this._flattenBufferIn();
			sharp_default.pipeline(this.options, (err, data, info) => {
				if (err) callback(is_default.nativeError(err, stack));
				else callback(null, data, info);
			});
		});
		else sharp_default.pipeline(this.options, (err, data, info) => {
			if (err) callback(is_default.nativeError(err, stack));
			else callback(null, data, info);
		});
		return this;
	} else if (this.options.streamOut) {
		if (this._isStreamInput()) {
			this.once("finish", () => {
				this._flattenBufferIn();
				sharp_default.pipeline(this.options, (err, data, info) => {
					if (err) this.emit("error", is_default.nativeError(err, stack));
					else {
						this.emit("info", info);
						this.push(data);
					}
					this.push(null);
					this.on("end", () => this.emit("close"));
				});
			});
			if (this.streamInFinished) this.emit("finish");
		} else sharp_default.pipeline(this.options, (err, data, info) => {
			if (err) this.emit("error", is_default.nativeError(err, stack));
			else {
				this.emit("info", info);
				this.push(data);
			}
			this.push(null);
			this.on("end", () => this.emit("close"));
		});
		return this;
	} else if (this._isStreamInput()) return new Promise((resolve, reject) => {
		this.once("finish", () => {
			this._flattenBufferIn();
			sharp_default.pipeline(this.options, (err, data, info) => {
				if (err) reject(is_default.nativeError(err, stack));
				else if (this.options.resolveWithObject) resolve({
					data,
					info
				});
				else resolve(data);
			});
		});
	});
	else return new Promise((resolve, reject) => {
		sharp_default.pipeline(this.options, (err, data, info) => {
			if (err) reject(is_default.nativeError(err, stack));
			else if (this.options.resolveWithObject) resolve({
				data,
				info
			});
			else resolve(data);
		});
	});
}
/**
* Decorate the Sharp prototype with output-related functions.
* @module Sharp
* @private
*/
var output_default = (Sharp) => {
	Object.assign(Sharp.prototype, {
		toFile,
		toBuffer,
		toUint8Array,
		withDensity,
		keepExif,
		withExif,
		withExifMerge,
		keepIccProfile,
		withIccProfile,
		keepGainMap,
		withGainMap,
		keepXmp,
		withXmp,
		keepMetadata,
		withMetadata,
		toFormat,
		jpeg,
		jp2,
		png,
		webp,
		tiff,
		avif,
		heif,
		jxl,
		gif,
		raw,
		tile,
		timeout,
		_updateFormatOut,
		_setBooleanOption,
		_read,
		_pipeline
	});
};
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/utility.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
var require$1 = createRequire(import.meta.url);
var runtimePlatform = libvips_default.runtimePlatformArch();
var libvipsVersion = sharp_default.libvipsVersion();
/**
* An Object containing nested boolean values representing the available input and output formats/methods.
* @member
* @example
* console.log(sharp.format);
* @returns {Object}
*/
var format = sharp_default.format();
format.heif.output.alias = ["avif", "heic"];
format.jpeg.output.alias = ["jpe", "jpg"];
format.tiff.output.alias = ["tif"];
format.jp2.output.alias = [
	"j2c",
	"j2k",
	"jp2",
	"jpx"
];
/**
* An Object containing the available interpolators and their proper values
* @readonly
* @enum {string}
*/
var interpolators = {
	/** [Nearest neighbour interpolation](http://en.wikipedia.org/wiki/Nearest-neighbor_interpolation). Suitable for image enlargement only. */
	nearest: "nearest",
	/** [Bilinear interpolation](http://en.wikipedia.org/wiki/Bilinear_interpolation). Faster than bicubic but with less smooth results. */
	bilinear: "bilinear",
	/** [Bicubic interpolation](http://en.wikipedia.org/wiki/Bicubic_interpolation) (the default). */
	bicubic: "bicubic",
	/** [LBB interpolation](https://github.com/libvips/libvips/blob/master/libvips/resample/lbb.cpp#L100). Prevents some "[acutance](http://en.wikipedia.org/wiki/Acutance)" but typically reduces performance by a factor of 2. */
	locallyBoundedBicubic: "lbb",
	/** [Nohalo interpolation](http://eprints.soton.ac.uk/268086/). Prevents acutance but typically reduces performance by a factor of 3. */
	nohalo: "nohalo",
	/** [VSQBS interpolation](https://github.com/libvips/libvips/blob/master/libvips/resample/vsqbs.cpp#L48). Prevents "staircasing" when enlarging. */
	vertexSplitQuadraticBasisSpline: "vsqbs"
};
/**
* An Object containing the version numbers of sharp, libvips
* and (when using prebuilt binaries) its dependencies.
*
* @member
* @example
* console.log(sharp.versions);
*/
var versions = { vips: libvipsVersion.semver };
/* node:coverage ignore next 15 */
if (!libvipsVersion.isGlobal) if (!libvipsVersion.isWasm) try {
	versions = require$1(`@img/sharp-${runtimePlatform}/versions`);
} catch (_) {
	try {
		versions = require$1(`@img/sharp-libvips-${runtimePlatform}/versions`);
	} catch (_) {}
}
else try {
	versions = require$1("@img/sharp-wasm32/versions");
} catch (_) {}
versions.sharp = package_default.version;
/* node:coverage ignore next 5 */
if (versions.heif && format.heif) {
	format.heif.input.fileSuffix = [".avif"];
	format.heif.output.alias = ["avif"];
}
/**
* Gets or, when options are provided, sets the limits of _libvips'_ operation cache.
* Existing entries in the cache will be trimmed after any change in limits.
* This method always returns cache statistics,
* useful for determining how much working memory is required for a particular task.
*
* @example
* const stats = sharp.cache();
* @example
* sharp.cache( { items: 200 } );
* sharp.cache( { files: 0 } );
* sharp.cache(false);
*
* @param {Object|boolean} [options=true] - Object with the following attributes, or boolean where true uses default cache settings and false removes all caching
* @param {number} [options.memory=50] - is the maximum memory in MB to use for this cache
* @param {number} [options.files=20] - is the maximum number of files to hold open
* @param {number} [options.items=100] - is the maximum number of operations to cache
* @returns {Object}
*/
function cache(options) {
	if (is_default.bool(options)) if (options) return sharp_default.cache(50, 20, 100);
	else return sharp_default.cache(0, 0, 0);
	else if (is_default.object(options)) {
		for (const property of [
			"memory",
			"files",
			"items"
		]) {
			const value = options[property];
			if (is_default.defined(value) && !(is_default.integer(value) && value >= 0)) throw is_default.invalidParameterError(property, "a positive integer", value);
		}
		return sharp_default.cache(options.memory, options.files, options.items);
	} else return sharp_default.cache();
}
cache(true);
/**
* Gets or, when a concurrency is provided, sets
* the maximum number of threads _libvips_ should use to process _each image_.
* These are from a thread pool managed by glib,
* which helps avoid the overhead of creating new threads.
*
* This method always returns the current concurrency.
*
* The default value is the number of CPU cores,
* except when using glibc-based Linux without jemalloc,
* where the default is `1` to help reduce memory fragmentation.
*
* A value of `0` will reset this to the number of CPU cores.
*
* Some image format libraries spawn additional threads,
* e.g. libaom manages its own 4 threads when encoding AVIF images,
* and these are independent of the value set here.
*
* :::note
* Further {@link /performance/ control over performance} is available.
* :::
*
* @example
* const threads = sharp.concurrency(); // 4
* sharp.concurrency(2); // 2
* sharp.concurrency(0); // 4
*
* @param {number} [concurrency]
* @returns {number} concurrency
*/
function concurrency(concurrency) {
	return sharp_default.concurrency(is_default.integer(concurrency) ? concurrency : null);
}
/* node:coverage ignore next 7 */
if (!process.env.MALLOC_ARENA_MAX && import_detect_libc.default.familySync() === import_detect_libc.default.GLIBC && !sharp_default._isUsingJemalloc()) sharp_default.concurrency(1);
else if (import_detect_libc.default.familySync() === import_detect_libc.default.MUSL && sharp_default.concurrency() === 1024) sharp_default.concurrency(availableParallelism());
/**
* An EventEmitter that emits a `change` event when a task is either:
* - queued, waiting for _libuv_ to provide a worker thread
* - complete
* @member
* @example
* sharp.queue.on('change', function(queueLength) {
*   console.log('Queue contains ' + queueLength + ' task(s)');
* });
*/
var queue = new events.EventEmitter();
/**
* Provides access to internal task counters.
* - queue is the number of tasks this module has queued waiting for _libuv_ to provide a worker thread from its pool.
* - process is the number of resize tasks currently being processed.
*
* @example
* const counters = sharp.counters(); // { queue: 2, process: 4 }
*
* @returns {Object}
*/
function counters() {
	return sharp_default.counters();
}
/**
* Get and set use of SIMD vector unit instructions.
* Requires libvips to have been compiled with highway support.
*
* Improves the performance of `resize`, `blur` and `sharpen` operations
* by taking advantage of the SIMD vector unit of the CPU, e.g. Intel SSE and ARM NEON.
*
* @example
* const simd = sharp.simd();
* // simd is `true` if the runtime use of highway is currently enabled
* @example
* const simd = sharp.simd(false);
* // prevent libvips from using highway at runtime
*
* @param {boolean} [simd=true]
* @returns {boolean}
*/
function simd(simd) {
	return sharp_default.simd(is_default.bool(simd) ? simd : null);
}
/**
* Block libvips operations at runtime.
*
* This is in addition to the `VIPS_BLOCK_UNTRUSTED` environment variable,
* which when set will block all "untrusted" operations.
*
* @since 0.32.4
*
* @example <caption>Block all TIFF input.</caption>
* sharp.block({
*   operation: ['VipsForeignLoadTiff']
* });
*
* @param {Object} options
* @param {Array<string>} options.operation - List of libvips low-level operation names to block.
*/
function block(options) {
	if (is_default.object(options)) if (Array.isArray(options.operation) && options.operation.every(is_default.string)) sharp_default.block(options.operation, true);
	else throw is_default.invalidParameterError("operation", "Array<string>", options.operation);
	else throw is_default.invalidParameterError("options", "object", options);
}
/**
* Unblock libvips operations at runtime.
*
* This is useful for defining a list of allowed operations.
*
* @since 0.32.4
*
* @example <caption>Block all input except WebP from the filesystem.</caption>
* sharp.block({
*   operation: ['VipsForeignLoad']
* });
* sharp.unblock({
*   operation: ['VipsForeignLoadWebpFile']
* });
*
* @example <caption>Block all input except JPEG and PNG from a Buffer or Stream.</caption>
* sharp.block({
*   operation: ['VipsForeignLoad']
* });
* sharp.unblock({
*   operation: ['VipsForeignLoadJpegBuffer', 'VipsForeignLoadPngBuffer']
* });
*
* @param {Object} options
* @param {Array<string>} options.operation - List of libvips low-level operation names to unblock.
*/
function unblock(options) {
	if (is_default.object(options)) if (Array.isArray(options.operation) && options.operation.every(is_default.string)) sharp_default.block(options.operation, false);
	else throw is_default.invalidParameterError("operation", "Array<string>", options.operation);
	else throw is_default.invalidParameterError("options", "object", options);
}
/**
* Decorate the Sharp class with utility-related functions.
* @module Sharp
* @private
*/
var utility_default = (Sharp) => {
	Sharp.cache = cache;
	Sharp.concurrency = concurrency;
	Sharp.counters = counters;
	Sharp.simd = simd;
	Sharp.format = format;
	Sharp.interpolators = interpolators;
	Sharp.versions = versions;
	Sharp.queue = queue;
	Sharp.block = block;
	Sharp.unblock = unblock;
};
//#endregion
//#region node_modules/.pnpm/sharp@0.35.3/node_modules/sharp/dist/index.mjs
/*!
Copyright 2013 Lovell Fuller and others.
SPDX-License-Identifier: Apache-2.0
*/
input_default(Sharp);
resize_default(Sharp);
composite_default(Sharp);
operation_default(Sharp);
colour_default(Sharp);
channel_default(Sharp);
output_default(Sharp);
utility_default(Sharp);
var dist_default = Sharp;
//#endregion
export { dist_default as default };
