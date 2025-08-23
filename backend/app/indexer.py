import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from web3 import Web3
from web3.contract import Contract
from web3.types import EventData, BlockNumber
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from contextlib import asynccontextmanager
import json
import os
from dataclasses import dataclass

from .database import get_db_session, AsyncSessionLocal
from .models import (
    Project, Member, Donation, Allocation, VotingRound, Vote, VoteResult,
    Payout, BlockchainEvent, IndexerState, AggregateStats
)
from .config import get_settings

logger = logging.getLogger(__name__)

@dataclass
class ContractConfig:
    address: str
    abi: List[Dict]
    start_block: int = 0

class BlockchainIndexer:
    def __init__(self):
        self.settings = get_settings()
        self.w3 = Web3(Web3.HTTPProvider(self.settings.rpc_url))
        self.contracts: Dict[str, Contract] = {}
        self.contract_configs: Dict[str, ContractConfig] = {}
        self.running = False
        self.poll_interval = 5  # seconds
        
    async def initialize(self):
        """Initialize the indexer with contract configurations."""
        logger.info("Initializing blockchain indexer...")
        
        # Load contract configurations
        await self._load_contract_configs()
        
        # Initialize contracts
        self._initialize_contracts()
        
        # Check blockchain connection
        try:
            logger.info(f"Attempting to connect to blockchain at {self.settings.rpc_url}")
            if not self.w3.is_connected():
                logger.error(f"Failed to connect to blockchain at {self.settings.rpc_url}")
                # Try to get more specific error information
                try:
                    block_number = self.w3.eth.block_number
                    logger.info(f"Actually connected! Block number: {block_number}")
                except Exception as e:
                    logger.error(f"Connection test failed: {e}")
                    raise Exception(f"Failed to connect to blockchain: {e}")
            else:
                logger.info("Blockchain connection successful")
        except Exception as e:
            logger.error(f"Blockchain connection error: {e}")
            raise Exception(f"Failed to connect to blockchain: {e}")
        
        # Check if we have any contracts configured
        if not self.contract_configs:
            logger.warning("No contracts configured - running in development mode")
            logger.warning("Backend will start but contract functionality will be limited")
        
        logger.info(f"Connected to blockchain at {self.settings.rpc_url}")
        logger.info(f"Latest block: {self.w3.eth.block_number}")
        
    async def _load_contract_configs(self):
        """Load contract addresses and ABIs from deployment artifacts."""
        contracts = {
            'Treasury': self.settings.treasury_address,
            'Projects': self.settings.projects_address,
            'GovernanceSBT': self.settings.governance_sbt_address,
            'BallotCommitReveal': self.settings.ballot_address,
            'CommunityMultisig': self.settings.multisig_address
        }
        
        for name, address in contracts.items():
            if not address:
                logger.warning(f"No address configured for {name}")
                continue
                
            # Load ABI (in production, you'd load from files)
            abi = self._get_contract_abi(name)
            
            self.contract_configs[name] = ContractConfig(
                address=address,
                abi=abi,
                start_block=self.settings.start_block
            )
    
    def _initialize_contracts(self):
        """Initialize Web3 contract instances."""
        for name, config in self.contract_configs.items():
            try:
                self.contracts[name] = self.w3.eth.contract(
                    address=config.address,
                    abi=config.abi
                )
                logger.info(f"Initialized contract {name} at {config.address}")
            except Exception as e:
                logger.error(f"Failed to initialize contract {name}: {e}")
    
    def _get_contract_abi(self, contract_name: str) -> List[Dict]:
        """Get contract ABI. In production, load from JSON files."""
        # Simplified ABIs for the enhanced contracts
        abis = {
            'Treasury': [
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "donor", "type": "address"},
                        {"indexed": False, "name": "amount", "type": "uint256"},
                        {"indexed": True, "name": "receiptId", "type": "bytes32"}
                    ],
                    "name": "DonationReceived",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "projectId", "type": "bytes32"},
                        {"indexed": False, "name": "amount", "type": "uint256"},
                        {"indexed": True, "name": "donor", "type": "address"},
                        {"indexed": True, "name": "receiptId", "type": "bytes32"}
                    ],
                    "name": "AllocationSet",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "fromProjectId", "type": "bytes32"},
                        {"indexed": True, "name": "toProjectId", "type": "bytes32"},
                        {"indexed": False, "name": "amount", "type": "uint256"},
                        {"indexed": True, "name": "donor", "type": "address"}
                    ],
                    "name": "AllocationReassigned",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "projectId", "type": "bytes32"},
                        {"indexed": False, "name": "amount", "type": "uint256"},
                        {"indexed": True, "name": "to", "type": "address"},
                        {"indexed": True, "name": "payoutId", "type": "bytes32"}
                    ],
                    "name": "AllocationReleased",
                    "type": "event"
                }
            ],
            'Projects': [
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "id", "type": "bytes32"},
                        {"indexed": False, "name": "name", "type": "string"},
                        {"indexed": False, "name": "target", "type": "uint256"},
                        {"indexed": False, "name": "softCap", "type": "uint256"},
                        {"indexed": False, "name": "hardCap", "type": "uint256"},
                        {"indexed": False, "name": "category", "type": "string"},
                        {"indexed": False, "name": "deadline", "type": "uint256"}
                    ],
                    "name": "ProjectCreated",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "id", "type": "bytes32"},
                        {"indexed": False, "name": "oldStatus", "type": "uint8"},
                        {"indexed": False, "name": "newStatus", "type": "uint8"},
                        {"indexed": False, "name": "reason", "type": "string"}
                    ],
                    "name": "ProjectStatusChanged",
                    "type": "event"
                }
            ],
            'GovernanceSBT': [
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "to", "type": "address"},
                        {"indexed": False, "name": "weight", "type": "uint256"},
                        {"indexed": False, "name": "totalDonated", "type": "uint256"}
                    ],
                    "name": "Minted",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "who", "type": "address"},
                        {"indexed": False, "name": "oldWeight", "type": "uint256"},
                        {"indexed": False, "name": "newWeight", "type": "uint256"},
                        {"indexed": False, "name": "totalDonated", "type": "uint256"}
                    ],
                    "name": "WeightUpdated",
                    "type": "event"
                }
            ],
            'BallotCommitReveal': [
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "roundId", "type": "uint256"},
                        {"indexed": False, "name": "startCommit", "type": "uint256"},
                        {"indexed": False, "name": "endCommit", "type": "uint256"},
                        {"indexed": False, "name": "endReveal", "type": "uint256"},
                        {"indexed": False, "name": "projectIds", "type": "bytes32[]"},
                        {"indexed": False, "name": "countingMethod", "type": "uint8"},
                        {"indexed": False, "name": "snapshotBlock", "type": "uint256"}
                    ],
                    "name": "RoundStarted",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "roundId", "type": "uint256"},
                        {"indexed": True, "name": "voter", "type": "address"},
                        {"indexed": False, "name": "projects", "type": "bytes32[]"},
                        {"indexed": False, "name": "choices", "type": "uint8[]"},
                        {"indexed": False, "name": "weight", "type": "uint256"}
                    ],
                    "name": "VoteRevealed",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "roundId", "type": "uint256"},
                        {"indexed": False, "name": "projectIds", "type": "bytes32[]"},
                        {"indexed": False, "name": "forWeights", "type": "uint256[]"},
                        {"indexed": False, "name": "againstWeights", "type": "uint256[]"},
                        {"indexed": False, "name": "abstainedCounts", "type": "uint256[]"},
                        {"indexed": False, "name": "notParticipatingCounts", "type": "uint256[]"},
                        {"indexed": False, "name": "turnoutPercentage", "type": "uint256"}
                    ],
                    "name": "VoteFinalized",
                    "type": "event"
                }
            ],
            'CommunityMultisig': [
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "txId", "type": "uint256"},
                        {"indexed": True, "name": "proposer", "type": "address"},
                        {"indexed": True, "name": "to", "type": "address"},
                        {"indexed": False, "name": "value", "type": "uint256"},
                        {"indexed": False, "name": "txType", "type": "uint8"},
                        {"indexed": False, "name": "projectId", "type": "bytes32"},
                        {"indexed": False, "name": "description", "type": "string"}
                    ],
                    "name": "TxProposed",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "txId", "type": "uint256"},
                        {"indexed": True, "name": "executor", "type": "address"}
                    ],
                    "name": "TxExecuted",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "projectId", "type": "bytes32"},
                        {"indexed": False, "name": "amount", "type": "uint256"},
                        {"indexed": False, "name": "to", "type": "address"},
                        {"indexed": False, "name": "txId", "type": "uint256"}
                    ],
                    "name": "ProjectPayoutCompleted",
                    "type": "event"
                }
            ]
        }
        
        return abis.get(contract_name, [])
    
    async def start_indexing(self):
        """Start the indexing process."""
        logger.info("Starting blockchain indexing...")
        self.running = True
        
        try:
            while self.running:
                await self._index_new_events()
                await asyncio.sleep(self.poll_interval)
        except Exception as e:
            logger.error(f"Indexing error: {e}")
            self.running = False
            raise
    
    def stop_indexing(self):
        """Stop the indexing process."""
        logger.info("Stopping blockchain indexing...")
        self.running = False
    
    async def _index_new_events(self):
        """Index new blockchain events."""
        for contract_name, contract in self.contracts.items():
            try:
                await self._index_contract_events(contract_name, contract)
            except Exception as e:
                logger.error(f"Error indexing {contract_name}: {e}")
    
    async def _index_contract_events(self, contract_name: str, contract: Contract):
        """Index events for a specific contract."""
        async with get_db_session() as session:
            # Get last processed block
            stmt = select(IndexerState).where(IndexerState.contract_address == contract.address)
            result = await session.execute(stmt)
            indexer_state = result.scalar_one_or_none()
            
            if indexer_state is None:
                indexer_state = IndexerState(
                    contract_address=contract.address,
                    last_processed_block=self.contract_configs[contract_name].start_block
                )
                session.add(indexer_state)
                await session.flush()
            
            from_block = indexer_state.last_processed_block + 1
            latest_block = self.w3.eth.block_number
            
            if from_block > latest_block:
                return  # No new blocks
            
            # Limit batch size to avoid timeouts
            to_block = min(from_block + 1000, latest_block)
            
            logger.debug(f"Indexing {contract_name} from block {from_block} to {to_block}")
            
            # Get all events for this contract
            events = contract.events
            
            for event_name in dir(events):
                if event_name.startswith('_'):
                    continue
                    
                try:
                    event_filter = getattr(events, event_name)
                    logs = event_filter.get_logs(fromBlock=from_block, toBlock=to_block)
                    
                    for log in logs:
                        await self._process_event(session, contract_name, event_name, log)
                        
                except Exception as e:
                    logger.error(f"Error processing {event_name} events: {e}")
            
            # Update indexer state
            indexer_state.last_processed_block = to_block
            indexer_state.last_updated = datetime.utcnow()
            
            await session.commit()
    
    async def _process_event(self, session: AsyncSession, contract_name: str, event_name: str, event_data: EventData):
        """Process a single blockchain event."""
        try:
            # Store raw event
            await self._store_raw_event(session, contract_name, event_name, event_data)
            
            # Process specific event types
            processor_method = f"_process_{contract_name.lower()}_{event_name.lower()}"
            if hasattr(self, processor_method):
                processor = getattr(self, processor_method)
                await processor(session, event_data)
            else:
                logger.warning(f"No processor for {contract_name}.{event_name}")
                
        except Exception as e:
            logger.error(f"Error processing event {contract_name}.{event_name}: {e}")
    
    async def _store_raw_event(self, session: AsyncSession, contract_name: str, event_name: str, event_data: EventData):
        """Store raw blockchain event."""
        blockchain_event = BlockchainEvent(
            contract_address=event_data.address,
            event_name=f"{contract_name}.{event_name}",
            event_data=dict(event_data.args),
            tx_hash=event_data.transactionHash.hex(),
            block_number=event_data.blockNumber,
            log_index=event_data.logIndex,
            processed=True
        )
        session.add(blockchain_event)
    
    # Event processors for Treasury contract
    async def _process_treasury_donationreceived(self, session: AsyncSession, event_data: EventData):
        """Process Treasury DonationReceived event."""
        # Get or create member
        member = await self._get_or_create_member(session, event_data.args.donor)
        
        # Create donation record
        block = self.w3.eth.get_block(event_data.blockNumber)
        amount_eth = self.w3.from_wei(event_data.args.amount, 'ether')
        
        donation = Donation(
            receipt_id=event_data.args.receiptId.hex(),
            donor_address=event_data.args.donor,
            amount=float(amount_eth),
            timestamp=datetime.fromtimestamp(block.timestamp),
            tx_hash=event_data.transactionHash.hex(),
            block_number=event_data.blockNumber
        )
        session.add(donation)
        
        # Update member totals
        member.total_donated += float(amount_eth)
    
    async def _process_treasury_allocationset(self, session: AsyncSession, event_data: EventData):
        """Process Treasury AllocationSet event."""
        block = self.w3.eth.get_block(event_data.blockNumber)
        amount_eth = self.w3.from_wei(event_data.args.amount, 'ether')
        
        allocation = Allocation(
            project_id=event_data.args.projectId.hex(),
            donor_address=event_data.args.donor,
            amount=float(amount_eth),
            timestamp=datetime.fromtimestamp(block.timestamp),
            allocation_type="direct",
            tx_hash=event_data.transactionHash.hex(),
            block_number=event_data.blockNumber
        )
        session.add(allocation)
        
        # Update project totals
        await self._update_project_funding(session, event_data.args.projectId.hex())
    
    # Event processors for Projects contract
    async def _process_projects_projectcreated(self, session: AsyncSession, event_data: EventData):
        """Process Projects ProjectCreated event."""
        block = self.w3.eth.get_block(event_data.blockNumber)
        
        project = Project(
            id=event_data.args.id.hex(),
            name=event_data.args.name,
            description="",  # Will be updated when full data is available
            target=float(self.w3.from_wei(event_data.args.target, 'ether')),
            soft_cap=float(self.w3.from_wei(event_data.args.softCap, 'ether')),
            hard_cap=float(self.w3.from_wei(event_data.args.hardCap, 'ether')),
            created_at=datetime.fromtimestamp(block.timestamp),
            category=event_data.args.category,
            created_block=event_data.blockNumber
        )
        
        if event_data.args.deadline > 0:
            project.deadline = datetime.fromtimestamp(event_data.args.deadline)
        
        session.add(project)
    
    # Event processors for GovernanceSBT contract
    async def _process_governancesbt_minted(self, session: AsyncSession, event_data: EventData):
        """Process GovernanceSBT Minted event."""
        member = await self._get_or_create_member(session, event_data.args.to)
        member.has_token = True
        member.weight = event_data.args.weight
        member.total_donated = float(self.w3.from_wei(event_data.args.totalDonated, 'ether'))
    
    async def _process_governancesbt_weightupdated(self, session: AsyncSession, event_data: EventData):
        """Process GovernanceSBT WeightUpdated event."""
        member = await self._get_or_create_member(session, event_data.args.who)
        member.weight = event_data.args.newWeight
        member.total_donated = float(self.w3.from_wei(event_data.args.totalDonated, 'ether'))
    
    # Event processors for BallotCommitReveal contract
    async def _process_ballotcommitreveal_roundstarted(self, session: AsyncSession, event_data: EventData):
        """Process BallotCommitReveal RoundStarted event."""
        voting_round = VotingRound(
            round_id=event_data.args.roundId,
            start_commit=datetime.fromtimestamp(event_data.args.startCommit),
            end_commit=datetime.fromtimestamp(event_data.args.endCommit),
            end_reveal=datetime.fromtimestamp(event_data.args.endReveal),
            counting_method="weighted" if event_data.args.countingMethod == 0 else "borda",
            snapshot_block=event_data.args.snapshotBlock
        )
        session.add(voting_round)
    
    async def _process_ballotcommitreveal_voterevealed(self, session: AsyncSession, event_data: EventData):
        """Process BallotCommitReveal VoteRevealed event."""
        block = self.w3.eth.get_block(event_data.blockNumber)
        
        # Process each vote in the revelation
        for i, project_id in enumerate(event_data.args.projects):
            if i < len(event_data.args.choices):
                choice_map = {0: "not_participating", 1: "abstain", 2: "against", 3: "for"}
                choice = choice_map.get(event_data.args.choices[i], "not_participating")
                
                vote = Vote(
                    round_id=event_data.args.roundId,
                    voter_address=event_data.args.voter,
                    project_id=project_id.hex(),
                    choice=choice,
                    weight=event_data.args.weight,
                    revealed_at=datetime.fromtimestamp(block.timestamp),
                    tx_hash=event_data.transactionHash.hex(),
                    block_number=event_data.blockNumber
                )
                session.add(vote)
    
    # Utility methods
    async def _get_or_create_member(self, session: AsyncSession, address: str) -> Member:
        """Get or create a member by address."""
        stmt = select(Member).where(Member.address == address)
        result = await session.execute(stmt)
        member = result.scalar_one_or_none()
        
        if member is None:
            member = Member(address=address)
            session.add(member)
            await session.flush()
        
        return member
    
    async def _update_project_funding(self, session: AsyncSession, project_id: str):
        """Update project funding totals."""
        # Sum allocations for this project
        stmt = select(Allocation).where(Allocation.project_id == project_id)
        result = await session.execute(stmt)
        allocations = result.scalars().all()
        
        total_allocated = sum(a.amount for a in allocations)
        
        # Update project
        stmt = update(Project).where(Project.id == project_id).values(total_allocated=total_allocated)
        await session.execute(stmt)
    
    async def force_reindex(self, contract_name: Optional[str] = None, from_block: Optional[int] = None):
        """Force reindex from a specific block."""
        logger.info(f"Force reindexing {contract_name or 'all contracts'}")
        
        async with get_db_session() as session:
            if contract_name:
                contracts_to_reindex = [contract_name]
            else:
                contracts_to_reindex = list(self.contracts.keys())
            
            for name in contracts_to_reindex:
                if name not in self.contracts:
                    continue
                    
                contract = self.contracts[name]
                
                # Reset indexer state
                stmt = select(IndexerState).where(IndexerState.contract_address == contract.address)
                result = await session.execute(stmt)
                indexer_state = result.scalar_one_or_none()
                
                if indexer_state:
                    indexer_state.last_processed_block = from_block or self.contract_configs[name].start_block
                else:
                    indexer_state = IndexerState(
                        contract_address=contract.address,
                        last_processed_block=from_block or self.contract_configs[name].start_block
                    )
                    session.add(indexer_state)
            
            await session.commit()
        
        logger.info("Reindex completed")

# Global indexer instance
indexer = BlockchainIndexer()