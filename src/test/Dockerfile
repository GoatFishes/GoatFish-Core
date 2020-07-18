FROM node:12-alpine

# The following is mostly for the api side
RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY ./package.json /usr/src/app/

RUN apk --no-cache --virtual build-dependencies add git python make g++ \
    && apk add curl \
    && git config --global url."https://".insteadOf git:// \
    && yarn install  \
    && yarn cache clean --force \
    && apk del build-dependencies \
    && apk add git bash && git clone https://github.com/vishnubob/wait-for-it.git

COPY . /usr/src/app

COPY entrypoint.sh /usr/src/app
RUN chmod +x /usr/src/app/entrypoint.sh

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
CMD ["npm","test"]
