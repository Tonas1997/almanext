@ECHO off
call env_windows\Scripts\activate
cd almanext_root
celery -A almanext_site worker --loglevel=INFO
PAUSE