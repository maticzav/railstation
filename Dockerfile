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
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl && \
    rm -rf /var/lib/apt/lists/*

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start

ENV PORT=3000
EXPOSE 3000

CMD [ "pnpm", "start" ]