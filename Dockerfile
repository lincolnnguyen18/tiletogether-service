FROM node:16-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 80
ENV NODE_ENV=production
CMD [ "node", "index.js" ]
