# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-22 AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the Maven project files to the working directory
COPY pom.xml .
COPY src ./src

# Package the application
RUN mvn clean package -DskipTests

# Stage 2: Create the final image
FROM eclipse-temurin:22-jdk-alpine AS runner

RUN apk add --update \
    curl \
    && rm -rf /var/cache/apk/*

# Set the working directory inside the container
WORKDIR /app

# Copy the built JAR file from the build stage
COPY --from=build /app/target/flstudio-plugin-organizer-0.0.1.jar /app/myapp.jar

# Expose port 8088
EXPOSE 8088/tcp

# Run the jar file
ENTRYPOINT ["java", "-jar", "myapp.jar"]