FROM registry.redhat.io/ubi8/nodejs-14
LABEL maintainer="NTT Communications Corporation"

# Create temporary directory for uploding files
RUN mkdir /tmp/upload
RUN chmod 777 /tmp/upload
VOLUME /tmp/upload
RUN apt add openssh \
     && echo "root:Docker!" | chpasswd
COPY sshd_config /etc/ssh/

# Create app directory
WORKDIR /app

# Bundle app source
COPY . .

EXPOSE 3000 2222
CMD [ "/usr/sbin/sshd" ]
