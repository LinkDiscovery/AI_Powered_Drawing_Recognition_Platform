---
description: restart backend server forcefully
---
# Restart Backend Server

1. Check for process on port 8080 and kill it.
// turbo
2. Find process id for port 8080
   `netstat -ano | findstr :8080`
3. Kill the process (Replace PID manually if needed, or use taskkill /F /IM java.exe if acceptable to kill all java)
   `taskkill /F /IM java.exe`
4. Start the server
   `java -jar backend/platform-backend/target/platform-backend-0.0.1-SNAPSHOT.jar`
