# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY EComm.Api/EComm.Api.csproj EComm.Api/
COPY EComm.Data/EComm.Data.csproj EComm.Data/
COPY EComm.Payment/EComm.Payment.csproj EComm.Payment/
RUN dotnet restore EComm.Api/EComm.Api.csproj
COPY . .
RUN dotnet publish EComm.Api/EComm.Api.csproj -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
RUN mkdir -p /app/uploads
ENTRYPOINT ["dotnet", "EComm.Api.dll"]
