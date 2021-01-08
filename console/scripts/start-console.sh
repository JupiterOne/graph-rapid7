LICENSE_FILE=$(sh -c "cd console/work && ls *.lic")

docker build ./console -t rapid7-vm-console && \
docker run \
  --rm \
  -p 3780:3780 \
  -e ACTIVATION_LICENSE_FILE=$LICENSE_FILE \
  --name rapid7-vm-console-container \
  rapid7-vm-console