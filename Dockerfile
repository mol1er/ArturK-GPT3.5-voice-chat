FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV port=3000

EXPOSE $PORT

CMD [ "npm", "start" ]