########################################################
# Multi-stage build, download installer
FROM ubuntu:18.04 as rapid7-installer 

# Set environment variables
ENV R7_VM_BIN Rapid7Setup-Linux64.bin

# Get Prerequisites
RUN apt-get update && \
    apt-get install --yes curl
    # rm -r /var/lib/apt/lists/*

# Download InsightVM/Nexpose
RUN curl -Lo /tmp/$R7_VM_BIN http://download2.rapid7.com/download/InsightVM/$R7_VM_BIN \
    && chmod +x /tmp/$R7_VM_BIN

########################################################
# Multi-stage build, run installer
FROM rapid7-installer as build

ENV R7_VARFILE Rapid7Setup-Linux64.varfile
COPY ./Rapid7Setup-Linux64.varfile /tmp/${R7_VARFILE}
RUN /tmp/$R7_VM_BIN -q -varfile=/tmp/$R7_VARFILE

########################################################
# Multi-stage build, run console
FROM ubuntu:18.04
# Set environment variables for API
ENV API_USER nxadmin
ENV API_PASSWORD nxpassword
ENV CONSOLE_PORT 3780

# Install postgresql necessary for Security Console
RUN apt-get update && \
    apt-get install --yes postgresql postgresql-contrib && \
    rm -r /var/lib/apt/lists/*

# Install curl necessary for activation and seeding
RUN apt-get update && apt-get install -y \
    curl \
    && rm -r /var/lib/apt/lists/*
  
# Copy product installation and work files
COPY --from=build /opt/rapid7 /opt/rapid7
COPY ./work .
# Expose Console Port for web/api interface
EXPOSE 3780

# # User:root so that we can copy the protected r7*.lic file
# USER root
CMD ["./run.sh"]
