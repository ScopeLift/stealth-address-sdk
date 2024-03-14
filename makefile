-include .env

# Default command to run when no target is specified
all: test-local


# Make anvil local
anvil-local:
	@echo "Starting Anvil with local fork..."
	# Start Anvil with the provided rpc url chain and capture its PID
	anvil -f $(TEST_RPC_URL) & echo $$! > anvil_pid.txt

# Test using the provided rpc url chain
test-remote:
	@echo "Running tests on remote chain..."
	# Run tests with environment variables
	env TEST_CHAIN_ID=$(TEST_CHAIN_ID) TEST_RPC_URL=$(TEST_RPC_URL) bun test src

# Test with local fork of the provided rpc url chain
test-local:
	@echo "Running tests on local fork..."
	# Run tests with environment variables
	env TEST_CHAIN_ID=$(TEST_CHAIN_ID) TEST_RPC_URL=$(TEST_RPC_URL) TEST_LOCAL_NODE_ENDPOINT=$(TEST_LOCAL_NODE_ENDPOINT) bun test src

.PHONY: all anvil-remote anvil-local test-remote test-local
