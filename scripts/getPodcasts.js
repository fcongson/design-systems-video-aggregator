require("dotenv").config();
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const axios = require("axios"); // Add Axios for making HTTP requests

const outputFilename = "data/output.json";
const outputDir = "../src/content/podcast/";

// Load previously imported episode data from output.json if it exists
let importedEpisodeData = [];

if (fs.existsSync(outputFilename)) {
  importedEpisodeData = JSON.parse(fs.readFileSync(outputFilename, "utf-8"));
}

// Import the sources from sources.json
const sourcesData = require("./sources-podcasts.json");

// Function to fetch podcast episodes from taddy.org
async function getAllEpisodesFromTaddy(podcastName) {
  try {
    const response = await axios.get(`https://taddy.org/podcasts/${podcastName}/episodes`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching episodes for ${podcastName}:`, error.message);
    return [];
  }
}

// Function to fetch specific episode from another podcast
async function getSpecificEpisode(podcastUrl, episodeId) {
  try {
    const response = await axios.get(`${podcastUrl}/episodes/${episodeId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching episode ${episodeId} from ${podcastUrl}:`, error.message);
    return null;
  }
}

// Function to generate an MDX file with episode data
function generateMdxFile(episode, folderPath) {
    const episodeTitle = episode.title;
    const episodeUrl = episode.episodeUrl; // Adjust this to match your podcast episode URL property
    const episodeDescription = episode.description;
    const privacyStatus = episode.privacyStatus; // Adjust this if needed
  
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-based, so add 1 and pad with leading zero
    const day = String(today.getDate()).padStart(2, "0"); // Pad with leading zero
    const formattedDate = `${year}-${month}-${day}`;
  
    // Define a function to remove special characters from a string
    function removeSpecialCharacters(str) {
      return str
        .replace(/[^\w\s-:"#]/g, "")
        .replace(/[\s-:"#]+/g, "-")
        .trim();
    }
  
    // Remove characters like :, ", and # from the title
    const sanitizedTitle = episodeTitle.replace(/[:"#]/g, "");
  
    // Generate a folder name without special characters
    const folderName = removeSpecialCharacters(
      slugify(sanitizedTitle, { lower: true }),
    )
      .split("-")
      .slice(0, 5)
      .join("-");
  
    // Define the file path for the index.mdx file
    const indexPath = path.join(folderPath, "index.mdx");
  
    // Create a folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  
    // Skip if index.mdx file already exists
    if (fs.existsSync(indexPath)) {
      return;
    }
  
    // Write the frontmatter and description to the index.mdx file
    fs.writeFileSync(
      indexPath,
      `---
  title: "${episodeTitle}"
  publishedAt: "${episode.publishedAt}" // Adjust this to match your podcast episode published date property
  dateAdded: "${formattedDate}"
  episodeUrl: "${episodeUrl}" // Adjust this to match your podcast episode URL property
  localImages: false
  tags: ["Unsorted"]
  categories: ["Podcast"]
  privacyStatus: "${privacyStatus}" // Adjust this if needed
  draft: true
  ---
  ${episodeDescription}\n`,
    );
  
    console.log(`Created folder and index.mdx file for ${sanitizedTitle}`);
  }
  

// Main function to retrieve data and generate output files
async function main() {
  try {
    console.log("Start: Gathering podcast data... 🎙️");

    const allEpisodes = [];
    let ignoredEpisodesCount = 0; // Initialize the count for ignored episodes

    for (const source of sourcesData) {
      if (source.type === "podcast-show") {
        const podcastName = source.name;
        const episodes = await getAllEpisodesFromTaddy(podcastName);

        for (const episode of episodes) {
          const episodeTitle = episode.title;
          // Implement logic to generate folderPath and check for ignored episodes

          const folderPath = path.join(outputDir, generateUniqueFolderName(episodeTitle)); 

          generateMdxFile(episode, folderPath);
          allEpisodes.push(episode);
        

          generateMdxFile(episode, folderPath);
          allEpisodes.push(episode);
        }
      } else if (source.type === "podcast-episode") {
        const { podcastUrl, episodeId } = source;
        const episode = await getSpecificEpisode(podcastUrl, episodeId);

        if (episode) {
          const episodeTitle = episode.title;
          // Implement logic to generate folderPath and check for ignored episodes

          generateMdxFile(episode, folderPath);
          allEpisodes.push(episode);
        } else {
          console.log(`Episode ${episodeId} from ${podcastUrl} not found.`);
        }
      }
      // Add logic for other podcast sources if needed
    }

    // Combine existing data with newly fetched data
    const combinedEpisodeData = [...importedEpisodeData, ...allEpisodes];

    // Sort episodes by publish date in descending order
    combinedEpisodeData.sort((a, b) => {
      const dateA = new Date(a.publishedAt);
      const dateB = new Date(b.publishedAt);
      return dateB - dateA;
    });

    // Write the combined episode data to output.json
    fs.writeFileSync(
      outputFilename,
      JSON.stringify(combinedEpisodeData, null, 2),
    );

    // Calculate the number of episodes added
    const episodesAdded = allEpisodes.length;

    // Calculate the new total of episodes
    const newTotalEpisodes = combinedEpisodeData.length;

    console.log(`Episode data written to ${outputFilename}`);
    console.log(`Episodes added: ${episodesAdded}`);
    console.log(`Ignored episodes: ${ignoredEpisodesCount}`); // Report the count of ignored episodes
    console.log(`New total of episodes: ${newTotalEpisodes}`);
    console.log("End: Gathering podcast data. ✅");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Call the main function to start retrieving data
main();
