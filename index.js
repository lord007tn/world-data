const fs = require('fs');
const path = require('path');
const https = require('https');

// Function to fetch data from URL
function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to fetch data: ${error.message}`));
    });
  });
}

// Function to read local JSON files
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Function to write JSON to file
function writeJsonFile(filePath, data) {
  try {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error.message);
  }
}

// Function to safely get string and convert to lowercase
function toLowerCode(code) {
  if (typeof code === 'string') {
    return code.toLowerCase();
  }
  return '';
}

// Main function to process and merge data
async function processData() {
  console.log('Starting data processing...');
  
  // Load or fetch countries data
  let countriesData;
  const countriesUrl = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries%2Bstates%2Bcities.json';
  const localCountriesPath = path.join(__dirname, 'countries-states-cities.json');
  
  if (fs.existsSync(localCountriesPath)) {
    console.log('Reading countries data from local file...');
    countriesData = readJsonFile(localCountriesPath);
  } else {
    console.log('Fetching countries data from GitHub...');
    try {
      countriesData = await fetchData(countriesUrl);
      writeJsonFile(localCountriesPath, countriesData);
    } catch (error) {
      console.error('Failed to fetch countries data:', error.message);
      return;
    }
  }
  
  if (!countriesData || !Array.isArray(countriesData)) {
    console.error('Countries data is not in the expected format.');
    return;
  }
  
  console.log(`Processing ${countriesData.length} countries...`);
  
  // Load additional data files
  const timezonesPath = path.join(__dirname, 'timezones.json');
  const languagesPath = path.join(__dirname, 'languages.json');
  const countryLanguageMappingPath = path.join(__dirname, 'country-language-mapping.json');
  
  // Load timezones data
  let timezonesData = {};
  if (fs.existsSync(timezonesPath)) {
    timezonesData = readJsonFile(timezonesPath) || {};
    console.log(`Loaded timezone data with ${Object.keys(timezonesData).length} entries`);
  } else {
    console.log('Timezone data file not found.');
  }
  
  // Load languages data
  let languagesData = {};
  if (fs.existsSync(languagesPath)) {
    const loadedData = readJsonFile(languagesPath);
    
    // Convert languages data to a map with lowercase language codes as keys
    if (Array.isArray(loadedData)) {
      // If it's an array of language objects
      loadedData.forEach(lang => {
        if (lang.code) {
          languagesData[toLowerCode(lang.code)] = lang;
        }
      });
    } else if (typeof loadedData === 'object' && loadedData !== null) {
      // If it's an object with language codes as keys
      Object.entries(loadedData).forEach(([code, data]) => {
        languagesData[toLowerCode(code)] = { 
          code: toLowerCode(code),
          ...data 
        };
      });
    }
    
    console.log(`Loaded language data with ${Object.keys(languagesData).length} entries`);
  } else {
    console.log('Languages data file not found.');
  }
  
  // Load country-language mapping
  let countryLanguageMapping = [];
  if (fs.existsSync(countryLanguageMappingPath)) {
    const loadedData = readJsonFile(countryLanguageMappingPath);
    
    // Convert mapping data to array format with lowercase codes
    if (Array.isArray(loadedData)) {
      countryLanguageMapping = loadedData.map(item => ({
        countryCode: toLowerCode(item.countryCode),
        languageCode: toLowerCode(item.languageCode)
      }));
    } else if (typeof loadedData === 'object' && loadedData !== null) {
      // If it's an object with country codes as keys
      Object.entries(loadedData).forEach(([countryCode, languageCodes]) => {
        const lowerCountryCode = toLowerCode(countryCode);
        
        if (Array.isArray(languageCodes)) {
          languageCodes.forEach(langCode => {
            countryLanguageMapping.push({
              countryCode: lowerCountryCode,
              languageCode: toLowerCode(langCode)
            });
          });
        } else if (typeof languageCodes === 'string') {
          countryLanguageMapping.push({
            countryCode: lowerCountryCode,
            languageCode: toLowerCode(languageCodes)
          });
        }
      });
    }
    
    console.log(`Loaded country-language mapping with ${countryLanguageMapping.length} entries`);
  } else {
    console.log('Country-language mapping file not found.');
  }
  
  // Process additional uploads for language and translation data
  const paste2Path = path.join(__dirname, 'paste-2.txt');
  const paste3Path = path.join(__dirname, 'paste-3.txt');
  
  // Parse paste-2.txt - language data
  let paste2Data = null;
  if (fs.existsSync(paste2Path)) {
    try {
      const content = fs.readFileSync(paste2Path, 'utf8');
      // Attempt to parse JSON with added closing brace if needed
      paste2Data = JSON.parse(`${content.trim().endsWith('}') ? content : content + '}'}`);
      console.log('Successfully parsed paste-2.txt (language data)');
      
      // Add to languagesData if it has necessary properties
      if (paste2Data && paste2Data.code) {
        const lowerCode = toLowerCode(paste2Data.code);
        languagesData[lowerCode] = {
          ...paste2Data,
          code: lowerCode
        };
      }
    } catch (error) {
      console.error('Error parsing paste-2.txt:', error.message);
    }
  }
  
  // Parse paste-3.txt - country data with translations
  let paste3Data = null;
  if (fs.existsSync(paste3Path)) {
    try {
      const content = fs.readFileSync(paste3Path, 'utf8');
      // Attempt to parse JSON with added closing brace if needed
      paste3Data = JSON.parse(`${content.trim().endsWith('}') ? content : content + '}'}`);
      console.log('Successfully parsed paste-3.txt (country translations)');
      
      // If this has country code and translations, add them to our data
      if (paste3Data && paste3Data.code) {
        const countryCode = toLowerCode(paste3Data.code);
        
        if (countriesByIso2[countryCode]) {
          // Add translations from paste3Data
          if (paste3Data.translations && Array.isArray(paste3Data.translations)) {
            // Merge with existing translations
            const existingTranslations = countriesByIso2[countryCode].translations || [];
            const newTranslations = paste3Data.translations;
            
            // Create a combined array, avoiding duplicates by language code
            const langCodeMap = {};
            [...existingTranslations, ...newTranslations].forEach(trans => {
              if (trans.languageCode) {
                langCodeMap[trans.languageCode] = trans;
              }
            });
            
            countriesByIso2[countryCode].translations = Object.values(langCodeMap);
          }
          
          // Add native language info if available
          if (paste3Data.nativeLanguageCode) {
            countriesByIso2[countryCode].nativeLanguageCode = toLowerCode(paste3Data.nativeLanguageCode);
          }
          
          // Add native name if available
          if (paste3Data.nativeName) {
            countriesByIso2[countryCode].nativeName = paste3Data.nativeName;
          }
        }
      }
    } catch (error) {
      console.error('Error parsing paste-3.txt:', error.message);
    }
  }
  
  console.log('Creating merged data...');
  
  // Create a map of countries by ISO2 code (lowercase)
  const countriesByIso2 = {};
  
  // Process countries - converting translations to array format
  for (const country of countriesData) {
    if (!country.iso2) continue; // Skip entries without ISO2 code
    
    const lowerIso2 = toLowerCode(country.iso2);
    
    // Convert translations from object to array format
    let translationsArray = [];
    if (country.translations && typeof country.translations === 'object') {
      translationsArray = Object.entries(country.translations).map(([langCode, name]) => ({
        languageCode: langCode,
        name
      }));
    }
    
    // Initialize country in map - but don't keep original timezones
    countriesByIso2[lowerIso2] = {
      ...country,
      iso2: lowerIso2, // Ensure lowercase
      iso3: toLowerCode(country.iso3),
      languages: [],   // Will hold language information
      timezones: [],   // Initialize empty - we'll replace with our own timezone data
      translations: translationsArray // Use array format for translations
    };
  }
  
  // Also look for additional country translations in a countries.json file
  const countriesJsonPath = path.join(__dirname, 'countries.json');
  if (fs.existsSync(countriesJsonPath)) {
    try {
      const countriesJson = readJsonFile(countriesJsonPath);
      
      if (Array.isArray(countriesJson)) {
        console.log(`Found ${countriesJson.length} country entries with translations in countries.json`);
        
        // Process each country for translations
        countriesJson.forEach(countryData => {
          if (countryData.code && countryData.translations) {
            const countryCode = toLowerCode(countryData.code);
            
            // If we have this country in our main data
            if (countriesByIso2[countryCode]) {
              // Add translations
              if (Array.isArray(countryData.translations)) {
                // Merge with existing translations
                const existingTranslations = countriesByIso2[countryCode].translations || [];
                const newTranslations = countryData.translations;
                
                // Create a combined array, avoiding duplicates by language code
                const langCodeMap = {};
                [...existingTranslations, ...newTranslations].forEach(trans => {
                  if (trans.languageCode) {
                    langCodeMap[trans.languageCode] = trans;
                  }
                });
                
                countriesByIso2[countryCode].translations = Object.values(langCodeMap);
              }
              
              // Add native language info if available
              if (countryData.nativeLanguageCode) {
                countriesByIso2[countryCode].nativeLanguageCode = toLowerCode(countryData.nativeLanguageCode);
              }
              
              // Add native name if available
              if (countryData.nativeName) {
                countriesByIso2[countryCode].nativeName = countryData.nativeName;
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error processing countries.json:', error.message);
    }
  }
  
  // If we have country data from paste-3.txt, add translations
  if (paste3Data && paste3Data.code) {
    const lowerIso2 = toLowerCode(paste3Data.code);
    
    if (countriesByIso2[lowerIso2]) {
      // Merge translations
      countriesByIso2[lowerIso2].translations = {
        ...(countriesByIso2[lowerIso2].translations || {}),
        ...(paste3Data.translations || {})
      };
      
      // Add native language info
      if (paste3Data.nativeLanguageCode) {
        countriesByIso2[lowerIso2].nativeLanguageCode = toLowerCode(paste3Data.nativeLanguageCode);
      }
    }
  }
  
  // Add timezones from our timezone data - using the full timezone objects
  if (timezonesData && typeof timezonesData === 'object') {
    // First create a map of timezones by country
    const timezonesByCountryMap = {};
    
    Object.entries(timezonesData).forEach(([tzCode, timezone]) => {
      if (timezone.details && timezone.details.country_code) {
        const countryCode = toLowerCode(timezone.details.country_code);
        
        if (!timezonesByCountryMap[countryCode]) {
          timezonesByCountryMap[countryCode] = [];
        }
        
        // Use the full timezone object with tzCode added
        timezonesByCountryMap[countryCode].push({
          tzCode,
          ...timezone  // Include all timezone properties
        });
      }
    });
    
    // Now assign these timezones to each country
    Object.entries(timezonesByCountryMap).forEach(([countryCode, timezones]) => {
      if (countriesByIso2[countryCode]) {
        countriesByIso2[countryCode].timezones = timezones;
      }
    });
  }
  
  // Add language data
  for (const mapping of countryLanguageMapping) {
    const countryCode = mapping.countryCode;
    const languageCode = mapping.languageCode;
    
    if (countryCode && languageCode && countriesByIso2[countryCode]) {
      const languageData = languagesData[languageCode];
      
      if (languageData) {
        // Check if this language is already added
        const existingLang = countriesByIso2[countryCode].languages.find(
          lang => toLowerCode(lang.code) === languageCode
        );
        
        if (!existingLang) {
          // Add language to country with translations
          countriesByIso2[countryCode].languages.push({
            code: languageCode,
            name: languageData.name || '',
            nativeName: languageData.nativeName || languageData.name || '',
            translations: languageData.translations || [] // Include translations
          });
        }
      }
    }
  }
  
  console.log('Creating timezone and currency mappings...');
  
  // Create timezones by country file - using the full timezone objects
  const timezonesByCountry = {};
  
  // Map timezones to countries
  if (timezonesData && typeof timezonesData === 'object') {
    Object.entries(timezonesData).forEach(([tzCode, timezone]) => {
      if (timezone.details && timezone.details.country_code) {
        const countryCode = toLowerCode(timezone.details.country_code);
        
        if (!timezonesByCountry[countryCode]) {
          timezonesByCountry[countryCode] = [];
        }
        
        // Add the complete timezone object
        timezonesByCountry[countryCode].push({
          tzCode,
          ...timezone
        });
      }
    });
  }
  
  // No need to add timezones from country data since we are entirely using our timezone data
  
  // Create currencies and countries using them
  const currenciesByCountry = {};
  
  Object.values(countriesByIso2).forEach(country => {
    if (country.currency) {
      const currency = country.currency.toUpperCase(); // Currencies are typically uppercase
      
      if (!currenciesByCountry[currency]) {
        currenciesByCountry[currency] = {
          code: currency,
          name: country.currency_name || currency,
          symbol: country.currency_symbol || '',
          countries: []
        };
      }
      
      currenciesByCountry[currency].countries.push({
        code: country.iso2,
        name: country.name
      });
    }
  });
  
  console.log('Creating additional output files...');
  
  // Create output directory
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 1. All timezones as array
  const allTimezones = Object.entries(timezonesData).map(([tzCode, timezone]) => ({
    tzCode,
    ...timezone,
    country_code: timezone.details && timezone.details.country_code ? 
      toLowerCode(timezone.details.country_code) : null
  }));
  
  // 2. All currencies
  const allCurrencies = Object.values(currenciesByCountry);
  
  // Get all countries from our merged data
  const allCountries = Object.values(countriesByIso2);
  
  // 3. All countries without states, cities, or translations
  const countriesSimple = allCountries.map(country => {
    // Create a new object without states, cities, or translations
    const { states, translations, ...simpleCountry } = country;
    return simpleCountry;
  });
  
  // 4. All countries with only translations
  const countriesWithTranslations = allCountries.map(country => {
    // Keep only country data and translations
    const { states, ...countryWithTrans } = country;
    return countryWithTrans;
  });
  
  // 5. All countries with states only (no cities)
  const countriesWithStates = allCountries
    .filter(country => country.states && country.states.length > 0)
    .map(country => {
      // Remove cities from states
      const statesWithoutCities = country.states.map(state => {
        const { cities, ...stateWithoutCities } = state;
        return stateWithoutCities;
      });
      
      // Return country with states but no cities
      return {
        ...country,
        states: statesWithoutCities
      };
    });
  
  // 6. All countries with states and cities
  const countriesWithStatesCities = allCountries
    .filter(country => 
      country.states && 
      country.states.length > 0 && 
      country.states.some(state => state.cities && state.cities.length > 0)
    );
  
  // 7. All countries with states, cities, and translations
  const countriesComplete = allCountries
    .filter(country => 
      country.states && 
      country.states.length > 0 && 
      country.states.some(state => state.cities && state.cities.length > 0) &&
      country.translations && 
      country.translations.length > 0
    );
    
  // 9. Countries with languages
  const countriesWithLanguages = allCountries
    .filter(country => country.languages && country.languages.length > 0);
    
  // 10. Countries without languages
  const countriesWithoutLanguages = allCountries
    .filter(country => !country.languages || country.languages.length === 0);


  // Write all output files
  console.log('Writing output files...');
  
  // Original outputs
  writeJsonFile(path.join(outputDir, 'merged-data.json'), allCountries);
  writeJsonFile(path.join(outputDir, 'timezones-by-country.json'), timezonesByCountry);
  writeJsonFile(path.join(outputDir, 'currencies-by-country.json'), currenciesByCountry);
  
  // Additional outputs
  writeJsonFile(path.join(outputDir, 'all-timezones.json'), allTimezones);
  writeJsonFile(path.join(outputDir, 'all-currencies.json'), allCurrencies);
  writeJsonFile(path.join(outputDir, 'countries-simple.json'), countriesSimple);
  writeJsonFile(path.join(outputDir, 'countries-with-translations.json'), countriesWithTranslations);
  writeJsonFile(path.join(outputDir, 'countries-with-states.json'), countriesWithStates);
  writeJsonFile(path.join(outputDir, 'countries-with-states-cities.json'), countriesWithStatesCities);
  writeJsonFile(path.join(outputDir, 'countries-complete.json'), countriesComplete);
  writeJsonFile(path.join(outputDir, 'countries-with-languages.json'), countriesWithLanguages);
  writeJsonFile(path.join(outputDir, 'countries-without-languages.json'), countriesWithoutLanguages);
  
  console.log('Data processing completed successfully!');
}

// Run the main function
processData().catch(error => {
  console.error('Error in data processing:', error);
});