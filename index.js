const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const ejs = require("ejs");
const os = require('os');
const app = express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.json());

function formatBytes(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

app.get("/", (req, res) => {
  const memoryUsage = process.memoryUsage();
  let uptimeInSeconds = process.uptime();

  let uptimeString = "";
  if (uptimeInSeconds < 60) {
    uptimeString = `${uptimeInSeconds.toFixed()} seconds`;
  } else if (uptimeInSeconds < 3600) {
    uptimeString = `${(uptimeInSeconds / 60).toFixed()} minutes`;
  } else if (uptimeInSeconds < 86400) {
    uptimeString = `${(uptimeInSeconds / 3600).toFixed()} hours`;
  } else {
    uptimeString = `${(uptimeInSeconds / 86400).toFixed()} days`;
  }

  const osInfo = {
    totalMemoryMB: (os.totalmem() / (1024 * 1024)).toFixed(2),
    freeMemoryMB: (os.freemem() / (1024 * 1024)).toFixed(2),
    cpus: os.cpus(),
  };

  res.render("index", { memoryUsage, uptimeString, formatBytes, osInfo });
});


app.get('/search', async (req, res) => {
  const { imageUrl } = req.query;
  try {
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = imageResponse.data;
    const formData = new FormData();
    formData.append('camera_type', '0');
    formData.append('source_type', '1');
    formData.append('video_autoplay_disabled', '1');
    formData.append('fields', 'pin.{description,created_at},pin.image_large_url');
    formData.append('page_size', '5');
    formData.append('image', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

    const headers = {
      'authorization': process.env.PKEY,
      'user-agent': 'Pinterest for Android/11.29.2 (SM-G988N; 7.1.2)',
     // 'x-node-id': 'true',
     // 'x-pinterest-app-type-detailed': '3',
     // 'x-pinterest-appstate': 'active',
     // 'x-pinterest-device': 'SM-G988N',
     // 'x-pinterest-device-hardwareid': '7fdedd5176230db5',
     // 'x-pinterest-device-manufacturer': 'samsung',
     // 'x-pinterest-installid': 'ecc4943ebc5f468f814aa3e17a9bcde',
      'content-type': `multipart/form-data;`,
      ...formData.getHeaders(),
    };
    const response = await axios.post(process.env.PINEY, formData, {
      headers: headers,
    });
    console.log(response.status)
    res.send(response.data);
  } catch (error) {
    console.error(error.response.data);
    res.send(error.response.data);
  }
});

app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});