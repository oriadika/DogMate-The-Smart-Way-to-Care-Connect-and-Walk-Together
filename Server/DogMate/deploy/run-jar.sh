#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

if [ -f server.env ]; then
  set -o allexport
  source server.env
  set +o allexport
fi

mkdir -p run-logs

JAR=$(ls target/*.jar 2>/dev/null | head -n1 || true)
if [ -z "$JAR" ]; then
  JAR=$(ls *.jar 2>/dev/null | head -n1 || true)
fi

if [ -z "$JAR" ]; then
  echo "No runnable jar found. Run ./deploy/build-jar.sh first or copy a jar into the application directory." >&2
  exit 1
fi

# Free memory on small EC2 instances by limiting the JVM heap size, metaspace, and native memory overhead.
JAVA_OPTS="-Xms64m -Xmx192m -XX:MaxRAMPercentage=50 -XX:+UseContainerSupport -XX:+UseSerialGC -XX:MetaspaceSize=64m -XX:MaxMetaspaceSize=256m -XX:MaxDirectMemorySize=64m"

# Stop any existing DogMate process started from the same jar name before launching.
if pgrep -f "java .* -jar .*DogMate-0.0.1-SNAPSHOT.jar" >/dev/null 2>&1; then
  echo "Stopping existing DogMate process..."
  pkill -f "java .* -jar .*DogMate-0.0.1-SNAPSHOT.jar" || true
  sleep 2
fi

echo "Starting $JAR"
nohup java $JAVA_OPTS -jar "$JAR" "$@" > run-logs/app.log 2>&1 &

echo $! > run-logs/app.pid
printf "Started app with PID %s. Logs: run-logs/app.log\n" "$(cat run-logs/app.pid)"
