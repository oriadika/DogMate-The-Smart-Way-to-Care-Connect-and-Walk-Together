#!/usr/bin/env bash
set -e
KEY=/tmp/dogmate-ec2-key.pem
REMOTE=ec2-user@16.171.68.255
JAR=/mnt/c/Users/gilpl/Desktop/DogMate-The-Smart-Way-to-Care-Connect-and-Walk-Together/Server/DogMate/target/DogMate-0.0.1-SNAPSHOT.jar

cp /mnt/c/Users/gilpl/Downloads/dogmate-ec2-key.pem "$KEY"
chmod 600 "$KEY"

ssh -i "$KEY" -o StrictHostKeyChecking=no "$REMOTE" 'mkdir -p /home/ec2-user/dogmate'
scp -i "$KEY" -o StrictHostKeyChecking=no "$JAR" "$REMOTE:/home/ec2-user/dogmate/"
if [ -f server.env ]; then
  scp -i "$KEY" -o StrictHostKeyChecking=no server.env "$REMOTE:/home/ec2-user/dogmate/server.env"
  echo "Uploaded local server.env to EC2."
else
  echo "WARNING: local server.env not found. Create Server/DogMate/server.env from deploy/server.env.example and fill in production values."
fi
scp -i "$KEY" -o StrictHostKeyChecking=no -r /mnt/c/Users/gilpl/Desktop/DogMate-The-Smart-Way-to-Care-Connect-and-Walk-Together/Server/DogMate/deploy "$REMOTE:/home/ec2-user/dogmate/"
ssh -i "$KEY" -o StrictHostKeyChecking=no "$REMOTE" '
  if pgrep -f "java .* -jar .*DogMate-0.0.1-SNAPSHOT.jar" >/dev/null 2>&1; then
    echo "Stopping old DogMate process..."
    pkill -f "java .* -jar .*DogMate-0.0.1-SNAPSHOT.jar" || true
    sleep 2
  fi
  if [ -f /home/ec2-user/dogmate/server.env ] && ! grep -q "<" /home/ec2-user/dogmate/server.env; then
    sed -i "s/\r$//" /home/ec2-user/dogmate/server.env
    cd /home/ec2-user/dogmate
    chmod +x ./deploy/run-jar.sh
    ./deploy/run-jar.sh
  else
    echo "server.env missing or contains placeholder values; not starting app"
  fi
'
