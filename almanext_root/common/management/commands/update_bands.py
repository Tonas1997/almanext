from django.core.management.base import BaseCommand
from django.db import connection
from common.models import Band

class Command(BaseCommand):
    args = '<coiso>'

    def _erase_bands(self):

        Band.objects.all().delete()

        cursor = connection.cursor()
        cursor.execute("delete from sqlite_sequence where name = 'common_band'")
    
    def _add_bands(self):
        for i in range(1, 11):
            if(i == 1):
                new_band = Band(designation=i, start=35, end=50)
            elif(i == 2):
                new_band = Band(designation=i, start=65, end=90)
            elif(i == 3):
                new_band = Band(designation=i, start=84, end=116)
            elif(i == 4):
                new_band = Band(designation=i, start=125, end=163)
            elif(i == 5):
                new_band = Band(designation=i, start=163, end=211)
            elif(i == 6):
                new_band = Band(designation=i, start=211, end=275)
            elif(i == 7):
                new_band = Band(designation=i, start=275, end=373)
            elif(i == 8):
                new_band = Band(designation=i, start=385, end=500)
            elif(i == 9):
                new_band = Band(designation=i, start=602, end=720)
            elif(i == 10):
                new_band = Band(designation=i, start=787, end=950)
            new_band.save()

    def handle(self, *args, **options):
        self._erase_bands()
        self._add_bands()