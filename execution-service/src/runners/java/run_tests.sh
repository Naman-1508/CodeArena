#!/bin/sh
# Compile the user's solution and our wrapper
javac -cp gson.jar Solution.java Main.java > compile_errors.txt 2>&1

if [ $? -ne 0 ]; then
    # Compilation failed
    ERRORS=$(cat compile_errors.txt | sed -e 's/"/\\"/g' -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\n/g')
    echo "{\"success\":false, \"output\":\"COMPILATION ERROR:\\n$ERRORS\", \"passed\":0, \"total\":0, \"memoryKb\":0}"
else
    # Run
    java -cp .:gson.jar Main
fi
