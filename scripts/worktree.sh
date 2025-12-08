#!/bin/bash

# Worktree Management Script for MindGrid
# Usage: ./scripts/worktree.sh <command> [options]
#
# Commands:
#   create <branch-name>  - Create a new worktree with the given branch name
#   list                  - List all worktrees
#   remove <branch-name>  - Remove a worktree
#   help                  - Show this help message

set -e

# Get the root directory of the git repository
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREES_DIR="$ROOT_DIR/worktrees"

# Configuration file for env files to copy
CONFIG_FILE="$ROOT_DIR/.worktree-config"

# Default env files to copy (can be overridden by .worktree-config)
DEFAULT_ENV_FILES=(".env" ".env.local" ".env.development" ".env.development.local")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Load configuration if exists
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        # shellcheck source=/dev/null
        source "$CONFIG_FILE"
    fi
}

# Get list of env files to copy
get_env_files() {
    if [ -n "${WORKTREE_ENV_FILES[*]}" ]; then
        echo "${WORKTREE_ENV_FILES[@]}"
    else
        echo "${DEFAULT_ENV_FILES[@]}"
    fi
}

# Copy .env files from main worktree to new worktree
copy_env_files() {
    local target_dir="$1"
    local env_files
    read -ra env_files <<< "$(get_env_files)"

    local copied=0

    # Find all .env files in the main directory (including subdirectories)
    for env_pattern in "${env_files[@]}"; do
        # Check root level
        if [ -f "$ROOT_DIR/$env_pattern" ]; then
            cp "$ROOT_DIR/$env_pattern" "$target_dir/$env_pattern"
            print_success "Copied $env_pattern to worktree"
            ((copied++))
        fi

        # Check in mindgrid subdirectory
        if [ -f "$ROOT_DIR/mindgrid/$env_pattern" ]; then
            mkdir -p "$target_dir/mindgrid"
            cp "$ROOT_DIR/mindgrid/$env_pattern" "$target_dir/mindgrid/$env_pattern"
            print_success "Copied mindgrid/$env_pattern to worktree"
            ((copied++))
        fi

        # Check in mindgrid/src-tauri subdirectory
        if [ -f "$ROOT_DIR/mindgrid/src-tauri/$env_pattern" ]; then
            mkdir -p "$target_dir/mindgrid/src-tauri"
            cp "$ROOT_DIR/mindgrid/src-tauri/$env_pattern" "$target_dir/mindgrid/src-tauri/$env_pattern"
            print_success "Copied mindgrid/src-tauri/$env_pattern to worktree"
            ((copied++))
        fi
    done

    if [ $copied -eq 0 ]; then
        print_info "No .env files found to copy"
    else
        print_success "Copied $copied .env file(s) to worktree"
    fi
}

# Create a new worktree
create_worktree() {
    local branch_name="$1"

    if [ -z "$branch_name" ]; then
        print_error "Branch name is required"
        echo "Usage: $0 create <branch-name>"
        exit 1
    fi

    # Sanitize branch name for directory
    local dir_name="${branch_name//\//-}"
    local worktree_path="$WORKTREES_DIR/$dir_name"

    # Check if worktree already exists
    if [ -d "$worktree_path" ]; then
        print_error "Worktree already exists at $worktree_path"
        exit 1
    fi

    # Create worktrees directory if it doesn't exist
    mkdir -p "$WORKTREES_DIR"

    # Check if branch exists locally or remotely
    if git -C "$ROOT_DIR" show-ref --verify --quiet "refs/heads/$branch_name" 2>/dev/null; then
        print_info "Using existing branch: $branch_name"
        git -C "$ROOT_DIR" worktree add "$worktree_path" "$branch_name"
    elif git -C "$ROOT_DIR" show-ref --verify --quiet "refs/remotes/origin/$branch_name" 2>/dev/null; then
        print_info "Creating branch from remote: $branch_name"
        git -C "$ROOT_DIR" worktree add "$worktree_path" -b "$branch_name" "origin/$branch_name"
    else
        print_info "Creating new branch: $branch_name"
        git -C "$ROOT_DIR" worktree add -b "$branch_name" "$worktree_path"
    fi

    print_success "Created worktree at $worktree_path"

    # Copy .env files
    copy_env_files "$worktree_path"

    echo ""
    print_success "Worktree '$branch_name' is ready!"
    echo ""
    echo "To start working:"
    echo "  cd $worktree_path"
    echo ""
}

# List all worktrees
list_worktrees() {
    print_info "Current worktrees:"
    echo ""
    git -C "$ROOT_DIR" worktree list
    echo ""
}

# Remove a worktree
remove_worktree() {
    local branch_name="$1"

    if [ -z "$branch_name" ]; then
        print_error "Branch name is required"
        echo "Usage: $0 remove <branch-name>"
        exit 1
    fi

    local dir_name="${branch_name//\//-}"
    local worktree_path="$WORKTREES_DIR/$dir_name"

    if [ ! -d "$worktree_path" ]; then
        print_error "Worktree not found at $worktree_path"
        exit 1
    fi

    print_warning "This will remove the worktree at $worktree_path"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git -C "$ROOT_DIR" worktree remove "$worktree_path"
        print_success "Removed worktree: $branch_name"

        # Optionally delete the branch
        read -p "Delete the branch '$branch_name' as well? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git -C "$ROOT_DIR" branch -d "$branch_name" 2>/dev/null || \
            git -C "$ROOT_DIR" branch -D "$branch_name" 2>/dev/null || \
            print_warning "Could not delete branch (may have unmerged changes or be checked out elsewhere)"
        fi
    else
        print_info "Operation cancelled"
    fi
}

# Show help
show_help() {
    cat << EOF
Worktree Management Script for MindGrid

Usage: $0 <command> [options]

Commands:
  create <branch-name>  Create a new worktree with the given branch name
                        - Creates the branch if it doesn't exist
                        - Copies .env files from main directory

  list                  List all worktrees

  remove <branch-name>  Remove a worktree (with confirmation)

  help                  Show this help message

Configuration:
  Create a .worktree-config file in the project root to customize which
  .env files are copied:

  # .worktree-config
  WORKTREE_ENV_FILES=(".env" ".env.local" ".env.secrets")

Examples:
  $0 create feature/new-feature
  $0 create bugfix/fix-login
  $0 list
  $0 remove feature/new-feature

EOF
}

# Main entry point
main() {
    load_config

    local command="${1:-help}"

    case "$command" in
        create)
            create_worktree "$2"
            ;;
        list)
            list_worktrees
            ;;
        remove)
            remove_worktree "$2"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
