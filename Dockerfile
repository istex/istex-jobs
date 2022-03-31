FROM node:14-alpine3.14

# to have git in the shell
# (to be able to use it in the crontab stuff)
#RUN apt-get update && apt-get install -y git

ENV NODE_ENV production
RUN mkdir -p /app
WORKDIR /app

# install npm dependencies
COPY ./package*.json /app/
RUN npm ci --only=production

COPY ./config /app/config
COPY ./helpers  /app/helpers
COPY ./resources  /app/resources
COPY ./src  /app/src
COPY ./Licen*  /app/
COPY ./config.json  /app/
COPY ./index.js  /app/

# ezmasterization see https://github.com/Inist-CNRS/ezmaster
RUN echo '{ \
  "httpPort": 8080, \
  "configPath": "/app/config.json", \
  "technicalApplication": true, \
  "dataPath": "/app/output" \
}' > /etc/ezmaster.json

EXPOSE 8080
ENTRYPOINT ["npm", "start"]