from django.core.management.base import BaseCommand
from django.db import connection
from common.models import EmissionLine

import pandas as pd
import re

class Command(BaseCommand):
    args = '<coiso>'

    def _erase_ems(self):

        EmissionLine.objects.all().delete()

        cursor = connection.cursor()
        cursor.execute("delete from sqlite_sequence where name = 'common_emissionline'")
    
    def _add_ems(self):
        co_lines = pd.read_table('C:/Users/anton/Documents/Faculdade/Tese/Projecto/almanext/COlines.dat', delim_whitespace=True, names = ['#Lines', 'Freq'])
        other_lines = pd.read_table('C:/Users/anton/Documents/Faculdade/Tese/Projecto/almanext/Otherlines.dat', delim_whitespace=True, names = ['#Lines', 'Freq'])

        em_files = [co_lines, other_lines]
        split_regex = "[_-]"
        for f in em_files: 
            for index, row in f.iterrows():
                # isolate each field
                if(index == 0):
                    continue
                chars = re.split(split_regex, row["#Lines"])
                print(str(chars))
                # get the chemical species' name
                str_species = chars[0]
                # get the emission lines
                if(len(chars) > 1):
                    str_line = ""
                    for l in chars[1:]:
                        str_line += (l + "-")
                    str_line = str_line[:-1] # remove the last dash :D
                # get the frequency
                freq = row["Freq"]
                # build the DB object
                new_em = EmissionLine (
                    line_id = row["#Lines"],
                    species = str_species,
                    line = str_line,
                    frequency = freq
                )

                new_em.save()

    def handle(self, *args, **options):
        self._erase_ems()
        self._add_ems()