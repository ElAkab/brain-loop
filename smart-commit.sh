#!/bin/bash

# 1. Add all changes to staging area
git add .

# 2. Ask Copilot CLI to generate a commit command
echo "🤖 Copilot is analyzing your changes..."

# The 'git?' command is the alias for Copilot CLI for Git
gh copilot suggest -t git "commit my changes with a professional message describing exactly what I did in this code"