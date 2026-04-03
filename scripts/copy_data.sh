#!/bin/bash
set -e
mkdir -p frontend/public/data
cp output/app_data/*.json frontend/public/data/
echo "Data copied to frontend/public/data/"
