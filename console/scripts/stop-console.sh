CONTAINER_ID=$(docker ps -q --filter name=rapid7-vm-console-container)

if [ -n "$CONTAINER_ID" ]; 
then
  echo "Stopping container: $CONTAINER_ID"
  docker stop $CONTAINER_ID
else
  echo "No running containers found with name 'rapid7-vm-console-container'" 
fi
