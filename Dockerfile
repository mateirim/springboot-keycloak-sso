# Stage 1: Build the Angular frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN ./node_modules/.bin/ng build --configuration production

# Stage 2: Build the Spring Boot application
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /home/app
COPY app/pom.xml .
RUN mvn dependency:go-offline -q
COPY app/src ./src
RUN rm -rf src/main/resources/static/* && mkdir -p src/main/resources/static
COPY --from=frontend-build /app/app/src/main/resources/public/ src/main/resources/static/
RUN mvn clean package -DskipTests -q

# Stage 3: Minimal runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /home/app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /home/app/target/*.jar app.jar
RUN chown appuser:appgroup app.jar
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
