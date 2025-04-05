const fs = require('fs');
const path = require('path');
const { createId } = require('@paralleldrive/cuid2');

/**
 * Process all JSON files in a directory and add CUID to objects with 'id' property
 * @param {string} directoryPath - Path to the directory containing JSON files
 * @param {string} outputDir - Path to output directory (defaults to same directory with '-processed' suffix)
 */
function processJSONFiles(directoryPath, outputDir = null) {
  if (!outputDir) {
    outputDir = `${directoryPath}-processed`;
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all JSON files in the directory
  const files = fs.readdirSync(directoryPath)
    .filter(file => file.endsWith('.json'));

  console.log(`Found ${files.length} JSON files to process`);

  // Process each file
  files.forEach(file => {
    const filePath = path.join(directoryPath, file);
    const outputPath = path.join(outputDir, file);
    
    try {
      // Read and parse JSON file
      const rawData = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(rawData);
      
      // Process JSON data
      const processedData = processJSON(jsonData);
      
      // Write processed data to output file
      fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));
      console.log(`Processed: ${file}`);
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  });

  console.log(`All files processed. Results saved to: ${outputDir}`);
}

/**
 * Process JSON data, adding CUID to objects with 'id' property
 * @param {any} data - JSON data to process
 * @returns {any} - Processed JSON data
 */
function processJSON(data) {
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => processJSON(item));
  }
  
  // Handle objects
  if (data && typeof data === 'object') {
    const result = { ...data };
    
    // Check if object has an 'id' property
    if ('id' in result) {
      // Add cuid
      result.cuid = createId();
    }
    
    // Process nested properties
    for (const key in result) {
      if (result[key] && (typeof result[key] === 'object')) {
        result[key] = processJSON(result[key]);
      }
    }
    
    return result;
  }
  
  // Return primitive values as is
  return data;
}
processJSONFiles('./output', './output-cuid');