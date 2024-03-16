import express from 'express';
import axios from 'axios';
import pkg from 'threads-api';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const { ThreadsAPI } = pkg;
const threadsAPIKey = new ThreadsAPI({
  deviceId: 'android-18aniwgtc6yo00',
});
const threadsAPI = new ThreadsAPI();

let fetchedImageUUID = null;

const router = express.Router();
const app = express();

app.use(cors());

router.get('/fetch-image', async (req, res) => {
  try {
    const threadUrl = req.query.url;
    const postID = await threadsAPI.getPostIDfromURL(threadUrl);

    if (!postID) {
      console.log('No postID available.');
      return res.status(404).json({ error: 'PostID not found.' });
    } else {
      const post = await threadsAPI.getThreads(postID);
      const postData = JSON.stringify(post.containing_thread);
      const parseData = JSON.parse(postData);
      const imageCandidates = parseData.thread_items[0].post.image_versions2.candidates;

      let highestQualityURL = imageCandidates[0].url;
      let highestResolution = imageCandidates[0].width * imageCandidates[0].height;

      for (const candidate of imageCandidates) {
        const resolution = candidate.width * candidate.height;
        if (resolution > highestResolution) {
          highestQualityURL = candidate.url;
          highestResolution = resolution;
        }
      }

      console.log('Highest quality profile pic URL:', highestQualityURL);
      const imgResponse = await axios.get(highestQualityURL, { responseType: 'stream' });
      const imgPath = `./threadsRes/image_${uuidv4()}.jpg`; // Generate unique filename
      fetchedImageUUID = imgPath.match(/image_(.*).jpg/)[1]; // Extract UUID from the filename
      const imgStream = fs.createWriteStream(imgPath);

      imgResponse.data.pipe(imgStream);

      imgStream.on('finish', () => {
        console.log('Image downloaded and saved.');
        const responseJSON = {
          message: 'Image downloaded and saved',
        };
        res.json(responseJSON);
      });

      imgStream.on('error', (err) => {
        console.error('Error downloading image:', err);
        res.status(500).json({ error: 'Error downloading image.', details: err.message });
      });
    }
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.get('/download-image', (req, res) => {
  if (!fetchedImageUUID) {
    return res.status(400).json({ error: 'No image has been fetched.' });
  }
 const downloadImg = req.query.url;
  const imgPath = `./threadsRes/image_${fetchedImageUUID}.jpg`; // Use the UUID from the fetched image

  res.set({
    'Content-Type': 'image/jpeg',
    'Content-Disposition': `attachment; filename="image_${fetchedImageUUID}.jpeg"`,
  });

  const imgStream = fs.createReadStream(imgPath);

  imgStream.pipe(res);

  imgStream.on('finish', () => {
    fs.unlink(imgPath, (error) => {
      if (error) {
        console.error('Error deleting image file:', error);
      } else {
        console.log('Image file deleted successfully!');
      }
    });
  });

  imgStream.on('error', (err) => {
    console.error('Error streaming image:', err);
    res.status(500).json({ error: 'Error streaming image.' });
  });
});

router.get('/fetch-crsel-media', async (req, res) => {
  try {
    const threadUrl = req.query.url;
    const postID = await threadsAPI.getPostIDfromURL(threadUrl);

    if (!postID) {
      console.log('No postID available.');
      return res.status(404).json({ error: 'PostID not found.' });
    } else {
      const post = await threadsAPI.getThreads(postID);
      const postData = JSON.stringify(post.containing_thread);
      const parseData = JSON.parse(postData);

      // Add your logic here to extract the carousel media URLs
      const carouselItems = parseData.thread_items[0].post.carousel_media;

      if (!carouselItems || carouselItems.length === 0) {
        console.log('No carousel items available.');
        return res.status(404).json({ error: 'Carousel items not found.' });
      }
      
      const crselDir = './threadsRes/crsel_media';
      if (!fs.existsSync(crselDir)) {
        fs.mkdirSync(crselDir, { recursive: true });
      }

      const downloadPromises = carouselItems.map(async (item, index) => {
        const mediaURL = item.image_versions2.candidates[0].url;
        const mediaResponse = await axios.get(mediaURL, { responseType: 'arraybuffer' });
        const mediaPath = path.join(crselDir, `media${index + 1}.jpg`);
        fs.writeFileSync(mediaPath, Buffer.from(mediaResponse.data, 'binary'));
      });

      await Promise.all(downloadPromises);

      console.log('Carousel media downloaded and saved.');
      const responseJSON = { message: 'Carousel Image downloaded and saved.' };
        res.json(responseJSON); 
    }
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

let fetchedVideoUUID;  // Declare at a higher scope

router.get('/fetch-video', async (req, res) => {
  try {
    const threadUrl = req.query.url;
    const postID = await threadsAPI.getPostIDfromURL(threadUrl);

    if (!postID) {
      console.log('No postID available.');
      return res.status(404).json({ error: 'PostID not found.' });
    } else {
      const post = await threadsAPI.getThreads(postID);
      const postData = JSON.stringify(post.containing_thread);
      const parseData = JSON.parse(postData);

      // Find the video URL with the highest resolution
      const videoCandidates = parseData.thread_items[0].post.video_versions;

      if (!videoCandidates || videoCandidates.length === 0) {
        console.log('No video available.');
        return res.status(404).json({ error: 'Video not found.' });
      }

      let highestQualityURL = videoCandidates[0].url;
      let highestResolution = videoCandidates[0].width * videoCandidates[0].height;

      for (const candidate of videoCandidates) {
        const resolution = candidate.width * candidate.height;
        if (resolution > highestResolution) {
          highestQualityURL = candidate.url;
          highestResolution = resolution;
        }
      }

      console.log('Video URL:', highestQualityURL);

      // Generate a UUID for this video download
      const uuid = uuidv4();
      const vidPath = `./threadsRes/video_${uuid}.mp4`;
      // Update the fetchedVideoUUID at the higher scope
      fetchedVideoUUID = vidPath.match(/video_(.*).mp4/)[1];

      const vidResponse = await axios.get(highestQualityURL, { responseType: 'stream' });
      const vidStream = fs.createWriteStream(vidPath);

      vidResponse.data.pipe(vidStream);

      vidStream.on('finish', () => {
        console.log('Video downloaded and saved.');
        const responseJSON = { message: 'Video Downloaded and Saved.' };
        res.json(responseJSON);
      });

      vidStream.on('error', (err) => {
        console.error('Error downloading video:', err);
        res.status(500).json({ error: 'Error downloading video.' });
      });
    }
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.get('/download-video', (req, res) => {
  if (!fetchedVideoUUID) {
    return res.status(400).json({ error: 'No video has been fetched.' });
  }

  const vidPath = `./threadsRes/video_${fetchedVideoUUID}.mp4`;

  if (!fs.existsSync(vidPath)) {
    console.error('Video not found:', vidPath);
    return res.status(404).json({ error: 'Video not found.' });
  }

  const stat = fs.statSync(vidPath);

  res.set({
    'Content-Type': 'video/mp4',
    'Content-Disposition': `attachment; filename="video_${fetchedVideoUUID}.mp4"`,
    'Content-Length': stat.size,
  });

  const vidStream = fs.createReadStream(vidPath);
  vidStream.pipe(res);

  vidStream.on('error', (err) => {
    console.error('Error streaming video:', err);
    res.status(500).json({ error: 'Error streaming video.' });
  });

  vidStream.on('finish', () => {
    fs.unlink(vidPath, (error) => {
      if (error) {
        console.error('Error deleting video file:', error);
      } else {
        console.log('Video file deleted successfully!');
      }
    });
  });
});


router.get('/download-crsel-media', async (req, res) => {
  const crselDir = './threadsRes/crsel_media';

  // Check if the crsel_media directory exists
  if (!fs.existsSync(crselDir)) {
    return res.status(404).json({ error: 'Carousel media not found.' });
  }

  try {
    // Create a new JSZip instance
    const zip = new JSZip();

    // Add each media file to the zip archive with UUID in filenames
    const mediaFiles = fs.readdirSync(crselDir);
    
    mediaFiles.forEach((file, index) => {
      const filePath = path.join(crselDir, file);
      const uuid = uuidv4(); // Generate a unique UUID
      const mediaFilename = `media_${index + 1}_${uuid}.jpg`;

      const fileData = fs.readFileSync(filePath);
      zip.file(mediaFilename, fileData);
    });

    // Generate the zip file asynchronously
    const zipData = await zip.generateAsync({ type: 'nodebuffer' });

    // Set the appropriate headers for the zip file
    res.attachment('carousel_media.zip');
    res.send(zipData);

    // After sending the response, delete the carousel media files
    mediaFiles.forEach(file => {
      const filePath = path.join(crselDir, file);
      fs.unlinkSync(filePath); // Use fs.unlinkSync to delete files synchronously
    });
    
    console.log('Threads carousels deleted successfully!');
  } catch (error) {
    console.error('Error creating zip archive:', error);
    res.status(500).json({ error: 'Error creating zip archive.' });
  }
});

export default router; 
