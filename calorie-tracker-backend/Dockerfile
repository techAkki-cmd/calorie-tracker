FROM maven:3.9.10-eclipse-temurin-21 AS build

WORKDIR /workspace

COPY pom.xml ./
COPY api-gateway/pom.xml api-gateway/pom.xml
COPY identity-service/pom.xml identity-service/pom.xml
COPY core-service/pom.xml core-service/pom.xml
COPY ai-service/pom.xml ai-service/pom.xml

COPY api-gateway/src api-gateway/src
COPY identity-service/src identity-service/src
COPY core-service/src core-service/src
COPY ai-service/src ai-service/src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B package -Dmaven.test.skip=true

FROM eclipse-temurin:21-jre-jammy AS runtime

RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --create-home --shell /usr/sbin/nologin app

WORKDIR /app
USER app

FROM runtime AS api-gateway-runtime
COPY --from=build --chown=app:app /workspace/api-gateway/target/api-gateway-0.0.1-SNAPSHOT.jar ./application.jar
EXPOSE 9080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/application.jar"]

FROM runtime AS identity-service-runtime
COPY --from=build --chown=app:app /workspace/identity-service/target/identity-service-0.0.1-SNAPSHOT.jar ./application.jar
EXPOSE 9081
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/application.jar"]

FROM runtime AS core-service-runtime
COPY --from=build --chown=app:app /workspace/core-service/target/core-service-0.0.1-SNAPSHOT.jar ./application.jar
EXPOSE 9082
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/application.jar"]

FROM runtime AS ai-service-runtime
COPY --from=build --chown=app:app /workspace/ai-service/target/ai-service-0.0.1-SNAPSHOT.jar ./application.jar
EXPOSE 9083
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/application.jar"]
