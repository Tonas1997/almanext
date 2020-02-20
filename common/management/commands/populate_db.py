from django.core.management.base import BaseCommand
from common.models import Observation

import pandas as pd


class Command(BaseCommand):
    args = '<coiso>'

    def _populate_test(self):
        asa_file = pd.read_csv('/home/aantunes/Documents/ALMAThesis/almanext_root/Whole_ASAcat_metadata_Oct30th2019.csv')
        curr_obs = asa_file[(asa_file["Project code"] == "2011.0.00191.S")]
        print(curr_obs)


    def handle(self, *args, **options):
        self._populate_test()
