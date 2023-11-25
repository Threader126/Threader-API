import express from 'express';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStaticPath from 'ffmpeg-static';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/vid-metadata', (req, res) => {
  const vidUrl = req.query.url;
  ytdl.getBasicInfo(vidUrl)
    .then((info) => {
      const title = info.videoDetails.title;
      const durationInSeconds = info.videoDetails.lengthSeconds;
      const durationInMinutes = Math.floor(durationInSeconds / 60);
      const durationSeconds = durationInSeconds % 60;
      const formattedDuration = `${durationInMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
      const thumbUrl = info.videoDetails.thumbnails[4].url;

      const vidInfo = {
        title,
        formattedDuration,
        thumbUrl,
      };
      res.json(vidInfo)
    })
});

router.get('/vid-Lqsave', (req, res) => {
  const vidUrl = req.query.url;
  const requestId = uuidv4();
  ytdl.getBasicInfo(vidUrl)
    .then((info) => {
      const title = info.videoDetails.title;
      const sanitizedTitle = title.replace(/[^\w\d-_.]/g, '');
      const videoPath = `./streamFiles/${sanitizedTitle}_${requestId}.mp4`;
      const videoOptions = {
        quality: '18',
      };

      ytdl(vidUrl, videoOptions)
        .pipe(fs.createWriteStream(videoPath))
        .on('finish', () => {
          console.log('Video downloaded successfully!');
          res.set({
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="${sanitizedTitle}.mp4"`,
          });
          const videoStream = fs.createReadStream(videoPath);
          videoStream.pipe(res);

          res.on('finish', () => {
            fs.unlink(videoPath, (error) => {
              if (error) {
                console.error('Error deleting audio file:', error);
              } else {
                console.log('Audio file deleted successfully!');
              }
            });
          });
        });
    })
});

router.get('/vid-Mq', (req, res) => {
  const vidUrl = req.query.url;
  const requestId = uuidv4();
  const audioOptions = {
    quality: 'highestaudio',
    filter: 'audioonly',
  };

  const audioPath = `./streamFiles/audio_${requestId}.mp3`;
  const videoPath = `./streamFiles/video_${requestId}.mp4`;

  ytdl(vidUrl, audioOptions)
    .pipe(fs.createWriteStream(audioPath))
    .on('finish', () => {
      ytdl.getBasicInfo(vidUrl)
        .then((info) => {
          const title = info.videoDetails.title;
          const videoOptions = {
            quality: '135',
          };

          ytdl(vidUrl, videoOptions)
            .pipe(fs.createWriteStream(videoPath))
            .on('finish', () => {
              console.log('Audio and video downloaded successfully!');

              const mergedAudioPath = audioPath;
              const mergedVideoPath = videoPath;
              const outputFilePath = `./streamFiles/${title}.mp4`;

              ffmpeg.setFfmpegPath(ffmpegStaticPath);
              ffmpeg()
                .input(mergedVideoPath)
                .input(mergedAudioPath)
                .outputOptions('-c:v copy') // Keep the video codec the same
                .outputOptions('-c:a aac') // Set the audio codec to AAC
                .output(outputFilePath)
                .on('end', () => {
                  console.log('Merging completed');
                  // Send the response to the client indicating successful completion
                  res.send('Video download and merge completed!');
                })
                .on('error', (error) => {
                  console.error('Error merging files:', error);
                  // Send an error response to the client
                  res.status(500).send('Error merging files');
                })
                .run();
            })
            .on('error', (error) => {
              console.error('Error downloading video:', error);
              // Send an error response to the client
              res.status(500).send('Error downloading video');
            });
        });
    });
});

router.get('/vid-Hq', (req, res) => {
  const vidUrl = req.query.url;
  const requestId = uuidv4();
  const audioOptions = {
    quality: 'highestaudio',
    filter: 'audioonly',
  };

  const audioPath = `./streamFiles/audio_${requestId}.mp3`;
  const videoPath = `./streamFiles/video_${requestId}.mp4`;

  ytdl(vidUrl, audioOptions)
    .pipe(fs.createWriteStream(audioPath))
    .on('finish', () => {
      ytdl.getBasicInfo(vidUrl)
        .then((info) => {
          const title = info.videoDetails.title;
          const videoOptions = {
            quality: 'highestvideo',
          };

          ytdl(vidUrl, videoOptions)
            .pipe(fs.createWriteStream(videoPath))
            .on('finish', () => {
              console.log('Audio and video downloaded successfully!');

              const mergedAudioPath = audioPath;
              const mergedVideoPath = videoPath;
              const outputFilePath = `./streamFiles/${title}.mp4`;

              ffmpeg.setFfmpegPath(ffmpegStaticPath);
              ffmpeg()
                .input(mergedVideoPath)
                .input(mergedAudioPath)
                .outputOptions('-c:v copy') // Keep the video codec the same
                .outputOptions('-c:a aac') // Set the audio codec to AAC
                .output(outputFilePath)
                .on('end', () => {
                  console.log('Merging completed');
                  // Send the response to the client indicating successful completion
                  res.send('Video download and merge completed!');
                })
                .on('error', (error) => {
                  console.error('Error merging files:', error);
                  // Send an error response to the client
                  res.status(500).send('Error merging files');
                })
                .run();
            })
            .on('error', (error) => {
              console.error('Error downloading video:', error);
              // Send an error response to the client
              res.status(500).send('Error downloading video');
            });
        });
    });
});

router.get('/vid-download', (req, res) => {
  const vidUrl = req.query.url;
  const requestId = uuidv4();
  const videoPath = `./streamFiles/video_${requestId}.mp4`;
  const audioPath = `./streamFiles/audio_${requestId}.mp3`;

  ytdl.getBasicInfo(vidUrl)
    .then((info) => {
      const title = info.videoDetails.title;
      const filePath = `./streamFiles/${title}.mp4`;
      const fileStream = fs.createReadStream(filePath);
      const sanitizedTitle = title.replace(/[^\w\d-_.]/g, '');
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      res.set({
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${sanitizedTitle}.mp4"`,
        'Content-Length': fileSize,
      });
      fileStream.pipe(res);
      res.on('finish', () => {
        fs.unlink(videoPath, (error) => {
          if (error) {
            console.error('Error deleting video file:', error);
          } else {
            console.log('Video file deleted successfully!');
          }
        });

        fs.unlink(audioPath, (error) => {
          if (error) {
            console.error('Error deleting audio file:', error);
          } else {
            console.log('Audio file deleted successfully!');
          }
        });

        fs.unlink(filePath, (error) => {
          if (error) {
            console.error('Error deleting merged file:', error);
          } else {
            console.log('Merged file deleted successfully!');
          }
        });
      });
    })
    .catch((error) => {
      console.error('Error:', error);
      res.status(500).send('Error downloading video');
    });
});

//Endpoint for downloading video in high quality
router.get('/aud-metadata', (req, res) => {
  const audUrl = req.query.url;
  ytdl.getBasicInfo(audUrl)
    .then((info) => {
      const title = info.videoDetails.title;
      const durationInSeconds = info.videoDetails.lengthSeconds;
      const durationInMinutes = Math.floor(durationInSeconds / 60);
      const durationSeconds = durationInSeconds % 60;
      const formattedDuration = `${durationInMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
      const thumbUrl = info.videoDetails.thumbnails[4].url;
      const audInfo = {
        title,
        formattedDuration,
        thumbUrl,
      };
      res.json(thumbUrl)
    })
});

router.get('/audHq-save', (req, res) => {
  const audUrl = req.query.url;
  const requestId = uuidv4();
  const audioOptions = {
    quality: 'highestaudio',
    filter: 'audioonly',
  };
  ytdl.getBasicInfo(audUrl)
    .then((info) => {
      const title = info.videoDetails.title;
      const sanitizedTitle = title.replace(/[^\w\d-_.]/g, '');
      const audioPath = `./streamFiles/${sanitizedTitle}_${requestId}.mp3`;
      ytdl(audUrl, audioOptions).pipe(fs.createWriteStream(`./streamFiles/${sanitizedTitle}_${requestId}.mp3`))
        .on('finish', () => {
          console.log('Audio downloaded successfully!');
          res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${sanitizedTitle}.mp3"`,
          });
          const audioStream = fs.createReadStream(audioPath);
          audioStream.pipe(res);
          res.on('finish', () => {
            fs.unlink(audioPath, (error) => {
              if (error) {
                console.error('Error deleting audio file:', error);
              } else {
                console.log('Audio file deleted successfully!');
              }
            });
          })
        })
    })
})

export default router