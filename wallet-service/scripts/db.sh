#!/usr/bin/env bash
set -euo pipefail
psql -U postgres -c 'CREATE DATABASE wallet_service;' || true
