# Use Node.js LTS version
FROM node:18

# Set working directory
WORKDIR /services

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install nodemon globally
RUN npm install -g nodemon

# Copy the rest of the app files
COPY . .

# Set environment variable for production
ENV NODE_ENV=development

# Expose the port defined in .env
EXPOSE 5003

# Run the app
# CMD ["node", "server.js"]
# CMD ["nodemon", "server.js"]

# Run the app, using nodemon in development and node in production
CMD [ "sh", "-c", "if [ $NODE_ENV = 'production' ]; then node server.js; else nodemon server.js; fi" ]