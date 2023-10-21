# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Install Python
RUN apt-get update && apt-get install -y python3 && apt-get clean

# Optional: Install pip if you need it (for Python packages)
RUN apt-get update && apt-get install -y python3-pip && apt-get clean

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the entire project to the working directory
COPY . .

# Expose port 5000
EXPOSE 3000

# Define the command to start your Node.js server
CMD ["npm", "start"]
