import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Replace 'YOUR_BOT_TOKEN' with your actual Telegram bot token
const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
const webhookURL = process.env.WEBHOOK_URL || "";

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

app.post(`/bot${botToken}`, (req, res) => {
  const message = req.body.message;
  const chatId = message.chat.id;
  const text = message.text;

  // Respond to specific commands (e.g., /start)
  if (text === '/start') {
    sendMessage(chatId, 'Welcome to your Telegram bot!');
  } else {
    sendMessage(chatId, 'I received your message: ' + text);
  }

  res.status(200).send('OK');
});




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
