#! /bin/bash

# remove log files
echo "================ Start cleaning log files ================"
count=$(find . -type f -name "*.log" -exec rm -f {} \; -print | wc -l)
echo "$count log files deleted"
echo "=================== Log files cleaned ===================="
