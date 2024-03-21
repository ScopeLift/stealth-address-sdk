-include .env

# Default command to run when no target is specified
all: test-local

# Make anvil fork
anvil-fork:
	@echo "Starting Anvil with fork..."
	# Start Anvil with a fork of the provided rpc url chain
	anvil -f $(RPC_URL)

# Test using the provided rpc url chain
test-fork:
	@echo "Running tests on fork..."
	# Run tests with environment variables
	env RPC_URL=$(RPC_URL) USE_FORK=true bun test src

.PHONY: all anvil-fork test-fork
