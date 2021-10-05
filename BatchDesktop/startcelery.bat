@ECHO off
call ..\env_desktop\Scripts\activate
cd ..\almanext_root
celery -A almanext_site worker --loglevel=INFO --pool=solo
PAUSE