#!/bin/bash
set -e
mkdir -p frontend/public/data
mkdir -p frontend/public/reports
cp output/app_data/*.json frontend/public/data/

report_files=(
  "reports/rotation_promotion_analysis.json"
  "reports/rotation_promotion_analysis.md"
  "reports/rotation_match_plan.json"
  "reports/rotation_match_performance.json"
)

for report_file in "${report_files[@]}"; do
  if [ -f "$report_file" ]; then
    cp "$report_file" frontend/public/reports/
  else
    echo "Warning: missing report asset $report_file"
  fi
done

echo "Data copied to frontend/public/data/ and frontend/public/reports/"
