FROM node:18-alpine

WORKDIR /app

# Copiar todo
COPY . .

# Install dependencies from root
RUN npm install

# Install server dependencies
RUN cd server && npm install && cd ..

# Expose port
EXPOSE 8080 3001

# Run the app
CMD ["node", "server/index.js"]
