CONTAINER_NAME=$(docker ps -q --filter ancestor=rapid7-vm-console)

if [ -n "$CONTAINER_NAME" ]; 
then
  echo "Stopping container: $CONTAINER_NAME"
  docker stop $CONTAINER_NAME
else
  echo "No running containers found with image 'rapid7-vm-console'" 
fi
