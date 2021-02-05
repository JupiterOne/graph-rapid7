CONTAINER_NAME='rapid7-vm-console-container'

if [[ -n $(docker ps -q --filter name=$CONTAINER_NAME) ]];
then
  docker exec -t -i $CONTAINER_NAME sh -c "ls /opt/rapid7/nexpose/nsc/licenses"
  LICENSE_FILE=$(docker exec -t -i $CONTAINER_NAME sh -c "cd /opt/rapid7/nexpose/nsc/licenses && ls *.lic" | xargs)
  docker exec -t -i $CONTAINER_NAME sh -c "chmod a+rw /opt/rapid7/nexpose/nsc/licenses/r7lic8274442992447462605.lic"

  LICENSE_FILE=$(echo "$LICENSE_FILE" | xargs)
  echo "$LICENSE_FILE $LICENSE_FILE"
  # LICENSE_FILE='r7lic8274442992447462605.lic'
  docker cp $CONTAINER_NAME:/opt/rapid7/nexpose/nsc/licenses/$(echo $LICENSE_FILE) ./console && echo "Successfully saved console license at ./console/$LICENSE_FILE"
else
  echo "No running containers found with image 'rapid7-vm-console'" 
fi
# docker exec -t -i $CONTAINER_NAME