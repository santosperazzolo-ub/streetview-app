FROM node:18-alpine

# Instalar git y build tools necesarios
RUN apk add --no-cache git build-base python3

WORKDIR /app

# Copiar todo
COPY . .

# Install dependencies from root
RUN npm install

# Build frontend with Vite
RUN npm run build

# Install server dependencies
RUN cd server && npm install && cd ..

# Expose port
EXPOSE 8080 3001

# Run the app
CMD ["node", "server/index.js"]
