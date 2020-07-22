FROM node:12-alpine

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY ./package.json /usr/src/app/

RUN apk --no-cache --virtual build-dependencies add git python make g++ \
    && apk add curl \
    && git config --global url."https://".insteadOf git:// \
    && yarn install \
    && yarn cache clean --force \
    && apk del build-dependencies 

COPY . /usr/src/app

CMD ["yarn", "start"]
