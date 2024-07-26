require("dotenv").config();
const { build } = require("esbuild");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

console.log("\n----- Building project -----");

const entryPoints = glob.globSync("./src/client/**/*.ts");

// Create necessary directories
const createDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create required directories
createDir("./dist/client/nested/Build");

// Inject .env vars
const define = {};
for (const k in process.env) {
  if (!k.startsWith("PUBLIC_")) continue;
  console.log(` Injecting .env: ${k}`);
  define[`process.env.${k}`] = JSON.stringify(process.env[k]);
}

// Build into ./dist
build({
  bundle: true,
  entryPoints,
  outbase: './src/client',
  outdir: './dist/client',
  platform: 'browser',
  external: [],
  define,
}).then(() => {
  console.log("Client build completed.");

  // Copy additional files
  const copyFile = (src, dest) => {
    const buffer = fs.readFileSync(src);
    fs.writeFileSync(dest, buffer);
  };

  // Copy .env
  copyFile("./.env", "./dist/.env");

  // Copy index.html
  copyFile("./src/client/index.html", "./dist/client/index.html");
  copyFile("./src/client/nested/index.html", "./dist/client/nested/index.html");

  // Copy Unity build files
  const unityBuildFiles = fs.readdirSync("./src/client/nested/Build");
  unityBuildFiles.forEach((fileName) => {
    copyFile(`./src/client/nested/Build/${fileName}`, `./dist/client/nested/Build/${fileName}`);
  });

  console.log("Other files have been included in the dist folder");
  console.log("----- Project build ready -----\n");
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

// Ensure the index.html has the correct configuration
let htmlString = fs.readFileSync("./src/client/nested/index.html").toString();

// Apply resolution set algorithm
if (htmlString.includes("px; background:")) {
  const startIndex = htmlString.indexOf("width:");
  const endIndex = htmlString.indexOf("; background:");
  const replaceSubstring = htmlString.substring(startIndex, endIndex);
  htmlString = htmlString.replace(replaceSubstring, "width: 100vw; height: 100vh");
}

// Apply color reset algorithm
if (!htmlString.includes("background: #000000")) {
  const startIndex = htmlString.indexOf("; background:");
  const endIndex = startIndex + 21;
  const replaceSubstring = htmlString.substring(startIndex, endIndex);
  htmlString = htmlString.replace(replaceSubstring, "; background: #000000");
}

// Ensure Unity instance
const tab = "  ";
if (!htmlString.includes("var unityInstance;")) {
  htmlString = htmlString.replace("createUnityInstance", `var unityInstance;\n${tab}${tab}${tab}createUnityInstance`);
  htmlString = htmlString.replace("})", "}).then(instance => {\n" + `${tab}${tab}${tab}${tab}unityInstance = instance;\n` + `${tab}${tab}${tab}})`);
}

fs.writeFileSync("./src/client/nested/index.html", htmlString);
console.log("Nested HTML configuration ready");
