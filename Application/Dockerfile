FROM node:14
LABEL maintainer="NTT Communications Corporation"

# Create app directory
WORKDIR /app

# Bundle app source
COPY . .

EXPOSE 8080 80
CMD [ "npm", "start" ]
