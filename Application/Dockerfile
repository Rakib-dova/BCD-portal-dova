FROM registry.redhat.io/ubi8/nodejs-14
LABEL maintainer="NTT Communications Corporation"

# Create temporary directory for uploding files
RUN mkdir /home/upload
VOLUME /home/upload

# Create app directory
WORKDIR /app

# Bundle app source
COPY . .

EXPOSE 3000 2222
CMD [ "npm", "start" ]
