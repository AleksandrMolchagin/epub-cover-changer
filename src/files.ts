import { exec } from 'child_process';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

interface document {
  file_name: string;
  mime_type: string;
  file_id: string;
  file_unique_id: string;
  file_size: number;
}

async function changeEpubCover(epubFilePath: string, imageFilePath: string): Promise<void> {
  const pythonScriptPath = '/app/src/change_cover.py';

  return new Promise<void>((resolve, reject) => {
      exec(`python3 ${pythonScriptPath} /app/${epubFilePath} /app/${imageFilePath}`, (error, stdout, stderr) => {
          if (error) {
              console.error(`exec error: ${error}`);
              reject(error);
              return;
          }
          if (stderr && stderr.trim().length > 0) {
              console.error(`Errors: ${stderr}`);
              reject(new Error(stderr));
              return;
          }
          console.log(`Output: ${stdout}`);
          resolve();
      });
  });
}


export function checkIfEpub(file: document): boolean {
  return file.file_name.endsWith('.epub');
}

export function checkIfImage(file: document): boolean {
  return file.file_name.endsWith('.jpg') || file.file_name.endsWith('.png') || file.file_name.endsWith('.jpeg');
}

export function CheckIfUserEpubExists(chatId: number): boolean {
  return fs.existsSync(`${chatId}_book.epub`);
}

export function CheckIfUserImageExists(chatId: number): boolean {
  return fs.existsSync(`${chatId}_image.jpg`) || fs.existsSync(`${chatId}_image.png`);
}

export async function AddCoverToEpub(chatId: number, original_name: string): Promise<void> {
  await changeEpubCover(`${chatId}_book.epub`, `${chatId}_image`);
  fs.renameSync(`${chatId}_book.epub`, `${original_name}`);
}

export async function addAndRetrun(chatId: number, original_name: string): Promise<string> {
  try {
    await AddCoverToEpub(chatId, original_name);
    return `${original_name}`;
  } catch (error) {
    throw error;
  }
}

function reverseString(inputString: string): string {
  return inputString.split('').reverse().join('');
}

function changeName(chatId: number, original_file: document): string {
  if (checkIfImage(original_file)) {
    return `${chatId}_image`;
  } else if (checkIfEpub(original_file)) {
    return `${chatId}_book.epub`;
  }
  return '';
}

// Function to process and download files
export async function downloadFile(document: any, botToken: string, chatId: number): Promise<void> {
  try {
    // Get information about the file from the document object
    const fileId = document.file_id;
    const fileName = changeName(chatId, document);

    // Request the file path from the Telegram Bot API
    const { data } = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);

    if (data && data.result && data.result.file_path) {
      const fileDownloadUrl = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;

      
      const filePath = `${fileName}`;

      // Download the file and save it locally
      const response = await axios({
        url: fileDownloadUrl,
        method: 'GET',
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`File ${filePath} downloaded successfully.`);
          resolve('ok');
        });

        writer.on('error', (error) => {
          console.error('Error downloading file:', error);
          reject(error);
        });
      });
    } else {
      console.error('Failed to get file information from Telegram API.');
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error; // Rethrow the error to propagate it to the caller
  }
}


