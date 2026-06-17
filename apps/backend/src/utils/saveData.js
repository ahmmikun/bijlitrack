import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Saves data as a formatted JSON file to the src/data/ directory.
 * Creates the directory recursively if it doesn't exist.
 * @param {any} data - The data to serialize and save
 * @param {string} filename - The output filename
 * @returns {Promise<string>} The full path of the saved file
 */
export async function saveJson(data, filename) {
  const dataDir = path.resolve('src/data');
  const filePath = path.join(dataDir, filename);

  try {
    // Task 3.3: Create directory recursively if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true });

    // Task 3.2: Serialize and write formatted JSON
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, json, 'utf-8');

    // Task 3.4: Log success with file path and size in bytes
    const size = Buffer.byteLength(json, 'utf-8');
    console.log(`Saved: ${filePath} (${size} bytes)`);

    return filePath;
  } catch (error) {
    // Task 3.5: Log the error with file path, then re-throw
    console.error(`Error saving ${filePath}: ${error.message}`);
    throw error;
  }
}
