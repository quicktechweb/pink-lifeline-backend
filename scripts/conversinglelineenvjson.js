import fs from "node:fs";
import path from "node:path";

export const convertFirebaseJsonToEnv = () => {
  // Use current working directory
  const currentDir = process.cwd();

  try {
    // Scan directory for any JSON files
    const files = fs.readdirSync(currentDir);
    const jsonFiles = files.filter(
      (file) => file.endsWith(".json") && file !== "package.json"
    );

    if (jsonFiles.length === 0) {
      console.error(
        "❌ Error: No JSON file found in this directory. Drop your Firebase file here first."
      );
    //   process.exit(1);
    }

    // Automatically grab the first JSON file found
    const targetFile = jsonFiles[0];
    const jsonPath = path.join(currentDir, targetFile);
    const envPath = path.join(currentDir, ".env");

    console.log(`Found file: ${targetFile}. Processing...`);

    const rawData = fs.readFileSync(jsonPath, "utf8");
    const parsedJson = JSON.parse(rawData);
    const singleLineJson = JSON.stringify(parsedJson);

    // Format for .env
    const envEntry = `\nFIREBASE_SERVICE_ACCOUNT='${singleLineJson}'\n`;

    // Append to .env in the current directory
    fs.appendFileSync(envPath, envEntry, "utf8");

    console.log(
      `✅ Success! ${targetFile} converted and added to .env in this directory.`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
};

// Call it
convertFirebaseJsonToEnv();