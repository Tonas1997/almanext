@ECHO off
call ..\env_desktop\Scripts\activate
cd ..\almanext_root
py manage.py runserver
PAUSE