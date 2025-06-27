#!/bin/bash

# Script to run Claude Code review and post to GitHub PR
# Usage: ./scripts/claude-review.sh <pr-number>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <pr-number>"
    exit 1
fi

PR_NUMBER=$1

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY environment variable is not set"
    exit 1
fi

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN environment variable is not set"
    exit 1
fi

echo "Running Claude Code review for PR #$PR_NUMBER..."

# Run Claude Code review
claude-code review \
  --pr $PR_NUMBER \
  --format github-comment \
  --post-comment

echo "Claude review completed and posted to PR #$PR_NUMBER"