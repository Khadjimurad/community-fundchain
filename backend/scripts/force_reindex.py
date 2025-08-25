#!/usr/bin/env python3
import asyncio
import logging
from app.indexer import indexer

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def main():
    try:
        logger.info("Initializing indexer...")
        await indexer.initialize()
        # Reindex voting contract from block 0 to ensure VoteFinalized gets processed
        await indexer.force_reindex('BallotCommitReveal', from_block=0)
        # One active tick to process window
        await indexer._index_new_events()
        logger.info("Reindex done")
    except Exception as e:
        logger.error(f"Force reindex failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())


