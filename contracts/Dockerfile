FROM ghcr.io/foundry-rs/foundry:latest

# Switch to root user to avoid permission issues
USER root

WORKDIR /app

# Clean existing cache and out directories to avoid conflicts
RUN rm -rf cache out

# Copy contract files
COPY . .

# Build contracts with --via-ir flag to resolve "Stack too deep" errors
RUN forge build --via-ir

# Default command (can be overridden)
CMD ["forge", "script", "script/Deploy.s.sol"]