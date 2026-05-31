# EC2 Deployment for DogMate backend

This folder contains helper scripts and examples for running the Spring Boot backend on an EC2 Linux instance.

## Goal
Run the backend on EC2 using a built jar file instead of starting with `./mvnw`.

## Recommended flow

1. Build the runnable jar locally:
   ```bash
   cd Server/DogMate
   ./deploy/build-jar.sh
   ```

2. Copy the jar and environment file to your EC2 host:
   ```bash
   scp Server/DogMate/target/*.jar ec2-user@<EC2-IP>:/home/ec2-user/dogmate/
   scp Server/DogMate/server.env ec2-user@<EC2-IP>:/home/ec2-user/dogmate/server.env
   ```
   Create `Server/DogMate/server.env` locally from `Server/DogMate/deploy/server.env.example` and fill in your production values before uploading.

3. On EC2, install Java 17 and start the app:
   ```bash
   ssh ec2-user@<EC2-IP>
   cd /home/ec2-user/dogmate
   ./deploy/run-jar.sh
   ```

4. If you need to bootstrap an EC2 instance, use `deploy/ec2-user-data.sh` as user-data to install Java 17 and create a simple `run-jar.sh` helper.

## Notes

- The Spring Boot backend defaults to port `8080`.
- Make sure your EC2 security group allows inbound traffic on the port you want to use.
- `server.env` values override the default `application.properties` values.
- If your client app should talk to the EC2 host, set the backend base URL to your EC2 public IP or DNS.
- For smaller EC2 instances, the deployment scripts now start Java with constrained heap settings so the backend can run reliably on low-memory hosts.
