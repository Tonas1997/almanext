@ECHO off
start "server" startserver.bat
start "redis" startredis.bat
start "celery" startcelery.bat