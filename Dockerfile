# 1. Start with Node base image
FROM node:18-alpine AS base

# 2. Create app directory inside container
WORKDIR /app

# 3. Copy package.json and lock file for dependency install
COPY package*.json ./

# 4. Install dependencies
# RUN npm install
RUN npm ci

# 5. Copy all source files into container
COPY . .

# Build the app (only if using TypeScript or bundling step)
RUN npm run build 

# 6. Expose the app port (update if yours is different)
EXPOSE 8080

# 7. Start your app - adjust this path!
CMD ["node", "dist/index.js"]
