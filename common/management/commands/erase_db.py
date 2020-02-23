from django.core.management.base import BaseCommand
from common.models import Observation, Trace, SpectralWindow

class Command(BaseCommand):
    args = '<coiso>'

    def _erase_db(self):
        SpectralWindow.objects.all().delete()
        Observation.objects.all().delete()


    def handle(self, *args, **options):
        self._erase_db()
