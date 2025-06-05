# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.12.0
ARG PNPM_VERSION=8.15.7

# BASE -----------------------------------------------------------------------

FROM node:${NODE_VERSION}-slim AS base

# Remix app lives here
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@$PNPM_VERSION

# BUILD ----------------------------------------------------------------------

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install node modules
COPY --link package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application code
COPY --link . .

# RUN ------------------------------------------------------------------------

# Final stage for app image
FROM base

# Set production environment
ENV NODE_ENV="production"

# Copy built application
COPY --from=build /app /app

# Start

ENV PORT=3000
EXPOSE ${PORT}

CMD [ "pnpm", "start" ]