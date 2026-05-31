#!/bin/bash
set -e

# Bootstraps a Linux EC2 instance for DogMate backend.
if command -v yum >/dev/null 2>&1; then
  yum update -y
  yum install -y java-17-amazon-corretto-devel
elif command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y openjdk-17-jdk
else
  echo "Unsupported distro: install Java 17 manually" >&2
  exit 1
fi

mkdir -p /home/ec2-user/dogmate
cat > /home/ec2-user/dogmate/run-jar.sh <<'EOF'
#!/bin/bash
cd /home/ec2-user/dogmate
set -o allexport
source server.env
set +o allexport
JAVA_OPTS="-Xms128m -Xmx256m -XX:MaxRAMPercentage=60 -XX:+UseContainerSupport -XX:+UseG1GC -XX:MetaspaceSize=64m -XX:MaxMetaspaceSize=128m"
if pgrep -f "java -jar .*DogMate-0.0.1-SNAPSHOT.jar" >/dev/null 2>&1; then
  echo "Stopping existing DogMate process..."
  pkill -f "java -jar .*DogMate-0.0.1-SNAPSHOT.jar" || true
  sleep 2
fi
nohup java $JAVA_OPTS -jar *.jar > app.log 2>&1 &
EOF
chmod +x /home/ec2-user/dogmate/run-jar.sh

echo "EC2 bootstrap complete. Upload the built jar and server.env to /home/ec2-user/dogmate and run ./run-jar.sh"
