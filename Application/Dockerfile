FROM registry.redhat.io/ubi8/nodejs-14
LABEL maintainer="NTT Communications Corporation"

# Create app directory
WORKDIR /tmp/upload
WORKDIR /app

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]
