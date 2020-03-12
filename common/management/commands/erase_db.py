from django.core.management.base import BaseCommand
from django.db import connection
from common.models import Observation, Trace, SpectralWindow, Band, Array

class Command(BaseCommand):
    args = '<coiso>'

    def _erase_db(self):
        SpectralWindow.objects.all().delete()
        Observation.objects.all().delete()
        Trace.objects.all().delete()
        Band.objects.all().delete()
        Array.objects.all().delete()

        cursor = connection.cursor()
        cursor.execute("delete from sqlite_sequence")


    def handle(self, *args, **options):
        self._erase_db()
