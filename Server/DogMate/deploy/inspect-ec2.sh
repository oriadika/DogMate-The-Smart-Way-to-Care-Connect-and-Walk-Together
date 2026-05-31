#!/usr/bin/env bash
set -e
KEY=/tmp/dogmate-ec2-key.pem
REMOTE=ec2-user@16.171.68.255
ssh -i "$KEY" -o StrictHostKeyChecking=no "$REMOTE" <<'EOF'
ls -l /home/ec2-user/dogmate
printf '\n---\n'
if [ -f /home/ec2-user/dogmate/server.env ]; then
  echo server.env found
  if grep -q '<' /home/ec2-user/dogmate/server.env; then
    echo 'Placeholder server.env detected; removing it to avoid accidental startup.'
    rm /home/ec2-user/dogmate/server.env
  else
    echo 'Valid server.env found:'
    sed -n '1,20p' /home/ec2-user/dogmate/server.env
  fi
else
  echo no server.env
fi
EOF
