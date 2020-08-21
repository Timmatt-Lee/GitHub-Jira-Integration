FROM node:12

ENV PATH=$PATH:/app/node_modules/.bin
WORKDIR /app
COPY . .
RUN npm i --production

ENTRYPOINT ["node", "/app/index.js"]
