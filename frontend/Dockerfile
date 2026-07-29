# syntax=docker/dockerfile:1

FROM node:lts-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:lts-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_TENANT_ID=tenant-a
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_TENANT_ID=$VITE_TENANT_ID
RUN npm run build

FROM nginx:alpine AS final
EXPOSE 80
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
