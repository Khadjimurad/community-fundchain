FROM ghcr.io/foundry-rs/foundry:latest

WORKDIR /app

# Copy contract files
COPY . .

# Install dependencies and compile contracts
RUN forge install foundry-rs/forge-std --no-git

# Default command (can be overridden)
CMD ["forge", "test", "-vv"]