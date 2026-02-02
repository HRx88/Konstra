# Use Node.js 20 base image
FROM node:20

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads

# Expose the application port
EXPOSE 8000

# Command to run the application
CMD ["node", "app.js"]
