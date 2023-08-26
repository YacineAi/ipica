const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const ejs = require("ejs");
const os = require('os');
const https = require('https');
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

function keepAppRunning() {
  setInterval(() => {
    https.get(`${process.env.RENDER_EXTERNAL_URL}/ping`, (resp) => {
      if (resp.statusCode === 200) {
        console.log('Ping successful');
      } else {
        console.error('Ping failed');
      }
    });
  }, 5 * 60 * 1000); // 5 minutes in milliseconds
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

app.get('/ping', (req, res) => {
  res.status(200).json({ message: 'Ping successful' });
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
    //console.log(response.status)
    res.send(response.data);
  } catch (error) {
    console.error(error.response.data);
    res.send(error.response.data);
  }
});

app.get('/text', async (req, res) => {
  const { q } = req.query;
  try {
    var coded = `{"options":{"article":"","appliedProductFilters":"---","price_max":null,"price_min":null,"query":"${q}","scope":"pins","auto_correction_disabled":"","top_pin_id":"","filters":""},"context":{}}`
    const response = await axios.get(`https://${process.env.PTAPI}/?data=${coded}`);
    console.log(response.data.resource_response.data.sensitivity)
    if (response.data.resource_response.data.sensitivity.type != undefined) {
      res.send({
        "code" : 18,
        "status": "success",
        "message": "Sensitive Content"
    });
    } else {
      if (response.data.resource_response.data.results[0]) {
        const imageArray = [];
        response.data.resource_response.data.results.forEach((item) => {
          if (item.images && item.images.orig) {
            imageArray.push(item.images.orig);
          }
        });
        res.send({
          "code" : 0,
          "sugges": "TBS",
          "images": imageArray
        });
      } else {
        res.send({
          "code" : 1,
          "status": "success",
          "message": "No data available."
      });
      }
    }
  } catch (error) {
    console.error(error.response.status);
    res.send(error.response.data);
  }
});

app.listen(3000, () => {
  console.log(`App is on port : 3000`);
  keepAppRunning();
});