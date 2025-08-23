.PHONY: anvil build deploy backend web

anvil:
	anvil

build:
	cd contracts && forge build

deploy:
	cd contracts && forge script script/Deploy.s.sol --broadcast --rpc-url ${RPC_URL:-http://127.0.0.1:8545}

backend:
	cd backend && uvicorn app.main:app --reload

web:
	python3 -m http.server -d web 8080
