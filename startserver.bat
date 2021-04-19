@ECHO off
call env_windows\Scripts\activate
cd almanext_root
py manage.py runserver
PAUSE