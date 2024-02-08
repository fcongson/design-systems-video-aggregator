require("dotenv").config();
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const {
  getAllVideosFromChannel,
  getAllVideosFromPlaylist,
} = require("./youtube");
const { getAllVideosFromVimeo } = require("./vimeo");

const outputFilename = "data/output.json";
const outputDir = "../src/content/media/";

// Load previously imported video data from output.json if it exists
let importedVideoData = [];

if (fs.existsSync(outputFilename)) {
  importedVideoData = JSON.parse(fs.readFileSync(outputFilename, "utf-8"));
}

// Import the sources from sources.json
const sourcesData = require("./sources.json");

// Import the list of video URLs to ignore
const videosToIgnore = require("./ignore.json");

// Function to generate an MDX file with video data
function generateMdxFile(video, folderPath) {
  const thumbnailUrl = video.thumbnails.high.url;

  const posterUrl = getPosterUrl(video.thumbnails);

  const videoTitle = video.title;
  const videoUrl = video.videoUrl;
  const videoDescription = video.description;
  const privacyStatus = video.privacyStatus;

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
  const sanitizedTitle = videoTitle.replace(/[:"#]/g, "");

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
title: "${videoTitle}"
publishedAt: "${video.publishedAt}"
image: "${thumbnailUrl}"
dateAdded: "${formattedDate}"
poster: "${posterUrl}"
videoUrl: "${videoUrl}"
localImages: false
tags: ["Unsorted"]
categories: ["Video"]
duration: "${video.duration}"
privacyStatus: "${privacyStatus}"
draft: true
speakers: ["Unsorted"]
---
${videoDescription}\n`,
  );

  console.log(`Created folder and index.mdx file for ${sanitizedTitle}`);
}

// Function to retrieve an appropriate poster URL
function getPosterUrl(thumbnails) {
  // Check if maxres thumbnail is available, otherwise use high thumbnail
  if (thumbnails.maxres && thumbnails.maxres.url) {
    return thumbnails.maxres.url;
  } else if (thumbnails.high && thumbnails.high.url) {
    // Manually construct maxres URL from high URL
    const highUrl = thumbnails.high.url;
    return highUrl.replace("hqdefault.jpg", "maxresdefault.jpg");
  } else {
    // If no suitable thumbnail is found, return an empty string
    return "";
  }
}

// Main function to retrieve data and generate output files
async function main() {
  // Load previously imported video data from output.json if it exists
  let importedVideoData = [];

  if (fs.existsSync(outputFilename)) {
    importedVideoData = JSON.parse(fs.readFileSync(outputFilename, "utf-8"));
  }

  try {
    console.log("Start: Gathering video data... 📹");

    const allVideos = [];
    let ignoredVideosCount = 0; // Initialize the count for ignored videos

    for (const source of sourcesData) {
      if (source.type === "youtube-channel") {
        const channelUrl = source.url;
        const channelId = channelUrl.split("/").pop();
        // console.log(`Fetching videos from channel ${channelId}...`);
        const channelVideos = await getAllVideosFromChannel(
          channelId,
          importedVideoData,
        );

        for (const video of channelVideos) {
          const videoUrl = video.videoUrl;

          const sanitizedTitle = video.title.replace(
            /[:"“”#'‘’!?@_^%()]/gi,
            "",
          );
          const folderName = slugify(sanitizedTitle, { lower: true })
            .split("-")
            .slice(0, 7)
            .join("-");
          const folderPath = path.join(__dirname, outputDir, folderName);

          // Check if the video should be ignored
          if (videosToIgnore.includes(videoUrl)) {
            // console.log(`Skipping video: ${sanitizedTitle} (ignored)`);
            ignoredVideosCount++; // Increment the count for ignored videos
            continue; // Skip processing this video
          }

          generateMdxFile(video, folderPath);
          allVideos.push(video);
        }
      } else if (source.type === "youtube-playlist") {
        const playlistUrl = source.url;
        const playlistId = playlistUrl.split("list=")[1];
        // console.log(`Fetching videos from playlist ${playlistId}...`);
        const playlistVideos = await getAllVideosFromPlaylist(
          playlistId,
          importedVideoData,
        );

        for (const video of playlistVideos) {
          const videoUrl = video.videoUrl;
          const sanitizedTitle = video.title.replace(
            /[:"“”#'‘’!?@_^%()]/gi,
            "",
          );
          const folderName = slugify(sanitizedTitle, { lower: true })
            .split("-")
            .slice(0, 7)
            .join("-");
          const folderPath = path.join(__dirname, outputDir, folderName);

          // Check if the video should be ignored
          if (videosToIgnore.includes(videoUrl)) {
            console.log(`Skipping video: ${sanitizedTitle} (ignored)`);
            ignoredVideosCount++; // Increment the count for ignored videos
            continue; // Skip processing this video
          }

          generateMdxFile(video, folderPath);
          allVideos.push(video);
        }
      } else if (source.type === "vimeo") {
        // console.log(`Fetching videos from Vimeo...`);
        const vimeoVideos = await getAllVideosFromVimeo();

        for (const video of vimeoVideos) {
          const videoUrl = video.videoUrl;
          // Implement Vimeo video data processing here

          // Check if the video should be ignored
          if (videosToIgnore.includes(videoUrl)) {
            // console.log(`Skipping video: ${sanitizedTitle} (ignored)`);
            ignoredVideosCount++; // Increment the count for ignored videos
            continue; // Skip processing this video
          }

          allVideos.push(video);
        }
      }
    }

    // Combine existing data with newly fetched data
    const combinedVideoData = [...importedVideoData, ...allVideos];

    // Calculate the number of videos added
    const videosAdded = allVideos.length;

    // Sort videos by publish date in descending order
    combinedVideoData.sort((a, b) => {
      const dateA = new Date(a.publishedAt);
      const dateB = new Date(b.publishedAt);
      return dateB - dateA;
    });

    // Write the combined video data to output.json
    fs.writeFileSync(
      outputFilename,
      JSON.stringify(combinedVideoData, null, 2),
    );

    // Calculate the new total of videos
    const newTotalVideos = combinedVideoData.length;

    console.log(`Video data written to ${outputFilename}`);
    console.log(`Videos added: ${videosAdded}`);
    console.log(`Ignored videos: ${ignoredVideosCount}`); // Report the count of ignored videos
    console.log(`New total of videos: ${newTotalVideos}`);
    console.log("End: Gathering video data. ✅");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Call the main function to start retrieving data
main();
