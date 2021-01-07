# Running Rapid7 Nexpose Security Console

This project allows developers to set up a local Nexpose Security Console for
testing JupiterOne's Rapid7 InsightVM integration.

Existing code from this
[github repository](https://github.com/Acidburn0zzz/docker-rapid7-vm) was used
as a guide to developing a docker-based console.

## Starting the console

The docker container hosting a local Rapid7 Security Console instance can be
started by running the following in a terminal:

```sh
yarn start:console
```

Once started, the console can be accessed from <https://localhost:3780>, the
default port of the Rapid7 Nexpose Security Console. The console can be accessed
with the default username/password `nxadmin` and `nxpassword`.

**NOTE:** The local console uses a self-signed TLS Certificate, and some users
may need to work around browser security checkpoints in order to access the
console.

## Licensing the console

The Rapid7 Security Console needs to be licensed for use. This project's
[developer docs](../docs/development.md) describe the process for obtaining a
one-time-use License Key.

After using the License Key to access the console in your running container,
developers _must_ save the generated License File in order to re-use their
license when freshly starting this container. They can save the Rapid7 `.lic`
license file to this project's `console/work` directory, which will cause the
license file to be auto-installed any time the container is restarted.

```sh
# Figure out the container ID of the running `rapid7-vm-console` image
> docker ps
<container-id>

# Get the filename of the Rapid7 License file
> docker exec <container-id> sh -c "ls /opt/rapid7/nexpose/nsc/licenses"
<r7lic0000000000000000000.lic>

# Copy the license file from the container to the console/work directory
> docker cp <container-id>:/opt/rapid7/nexpose/nsc/licenses/<r7lic0000000000000000000.lic> console/work
```

Now, with the license file copied into the container's `work` directory, the
license will be auto-installed when a new container is launched.

## Stopping the console

The console container can be stopped by running

```sh
yarn stop:console
```
