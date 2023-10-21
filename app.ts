import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
import { addAndRetrun, checkIfEpub, checkIfImage, downloadFile } from './src/files';
dotenv.config();
import fs from 'fs';


const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Replace 'YOUR_BOT_TOKEN' with your actual Telegram bot token
const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
const webhookURL = process.env.WEBHOOK_URL || "";

// Create an object to save user uploads
const userUploadsImages: Record<string, Boolean> = {};
const userUploadsEpub: Record<string, Boolean> = {};
const userUploadOriginalName: Record<string, string> = {};


// configuring the bot via Telegram API to use our route below as webhook
const setupWebhook = async () => {
    try {
        const { data } = await axios.get(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookURL}&drop_pending_updates=true`);
        console.log(data)
    } catch (error) {
        return error
    }
}

app.get('/', (req, res) => {
    res.send('Hello, this is your Express.js server!');
});

app.post(`/bot${botToken}`, async (req, res) => {
    const message = req.body.message;
    const chatId = message.chat.id;
    const text = message.text;


    console.log('Received message:', req.body);
    // Check if two files are attached
    if (message.document) {
        if (checkIfImage(message.document)) {
            try {
                await downloadFile(message.document, botToken, chatId);
                userUploadsImages[chatId] = true;
            } catch (error) {
                sendMessage(chatId, 'Error downloading image.');
                return;
            }
        } else if (checkIfEpub(message.document)) {
            try {
                await downloadFile(message.document, botToken, chatId);
                userUploadsEpub[chatId] = true;
                userUploadOriginalName[chatId] = message.document.file_name;
            } catch (error) {
                sendMessage(chatId, 'Error downloading EPUB.');
                console.error(error);
                return;
            }
        }

        if (userUploadsImages[chatId] && userUploadsEpub[chatId]) {
            await sendMessage(chatId, 'Both files downloaded successfully. Adding cover to EPUB...');
            let original = '';
            try {
                original = await addAndRetrun(chatId, userUploadOriginalName[chatId]);
            } catch (error) {
                sendMessage(chatId, 'Error adding cover to EPUB.');
                console.error(error);
                return;
            }
            await sendMessage(chatId, 'Cover added successfully. Sending the file to you!');
            userUploadsImages[chatId] = false;
            userUploadsEpub[chatId] = false;
            await sendFileToUser(chatId, original, botToken);
        } else if (userUploadsImages[chatId] && !userUploadsEpub[chatId]) {
            sendMessage(chatId, 'Image downloaded successfully. Please send me an EPUB file.');
        } else if (userUploadsEpub[chatId] && !userUploadsImages[chatId]) {
            sendMessage(chatId, 'EPUB downloaded successfully. Please send me a cover image (uncompressed).');
        }

    } else {
        // Respond to other messages
        if (text === '/start') {
            sendMessage(chatId, 'Welcome to your Telegram bot! Please send me two files: an EPUB file and a cover image (uncompressed) 🌞✨');
        } else {
            sendMessage(chatId, '‼️ To use this bot, please send me two files: an EPUB file and a cover image (!!!uncompressed) 👀');
        }
    }

    res.status(200).send('OK');
});


async function sendFileToUser(chatId: number, filePath: string, botToken: string) {
    try {
      // Create a FormData object to send the file
      const formData = {
        chat_id: chatId,
        document: fs.createReadStream(filePath), // Read the file from the file system
      };
  
      // Send the file using the sendDocument method of the Telegram Bot API
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (response.status === 200) {
        console.log('File sent successfully to chat:', chatId);
      } else {
        console.error('Error sending file to chat. Status code:', response.status);
      }
    } catch (error) {
      console.error('Error sending file to chat:', error);
    }
  }


// Function to send a message using the Telegram Bot API
async function sendMessage(chatId: number, text: string) {
    try {
        const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const data = {
            chat_id: chatId,
            text: text,
        };

        const response = await axios.post(apiUrl, data);

        if (response.status === 200) {
            console.log('Message sent successfully:', response.data);
        } else {
            console.error('Error sending message. Status code:', response.status);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}


// Start the Express.js server
app.listen(port, async () => {
    // setting up our webhook url on server spinup
    try {
        console.log(`Server is up and Running at PORT: ${port}`)
        await setupWebhook()
        console.log(`Webhook setup successful: ${webhookURL}`)
    } catch (error) {
        console.log((error as Error).message)
    }
})
