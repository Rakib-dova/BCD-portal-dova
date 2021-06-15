FROM registry.redhat.io/ubi8/nodejs-14
LABEL maintainer="NTT Communications Corporation"

# Create temporary directory for uploding files
RUN mkdir /tmp/upload

# Create app directory
WORKDIR /app

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]
