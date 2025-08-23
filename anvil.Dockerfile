FROM ghcr.io/foundry-rs/foundry:latest

# Create custom entrypoint script
RUN echo '#!/bin/sh' > /tmp/entrypoint.sh && \
    echo 'exec anvil --host 0.0.0.0 "$@"' >> /tmp/entrypoint.sh && \
    chmod +x /tmp/entrypoint.sh

ENTRYPOINT ["/tmp/entrypoint.sh"]