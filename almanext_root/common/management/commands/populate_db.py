from django.core.management.base import BaseCommand
from common.models import Observation, Trace, SpectralWindow, Band, Array
import re
import math

import pandas as pd

def addBands():
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

def addArrays():
    array_list = {"12", "7", "TP"}
    for a in array_list:
        new_array = Array(designation=a)
        new_array.save()

def convertDate(str_date):
    if(isinstance(str_date, float) and math.isnan(str_date)):
        return None
    date_vals = str_date.split('/')
    day = date_vals[0]
    month = date_vals[1]
    year = date_vals[2]
    return(year + "-" + month + "-" + day)

def convertDateTime(str_date_time):
    date_time_vals = str_date_time.split(" ")
    date = convertDate(date_time_vals[0])
    time = date_time_vals[1]
    return(date + " " + time)


def newSpecWinFromRow(freq_string):
    # spectral window list that will be built upon
    spec_win_list = []
    # get individual frequency window strings
    str_wins = freq_string.split('U')
    for i in range(len(str_wins)):
        # remove square brackets
        str_win = re.sub("\[|\]| ", "", str_wins[i])
        # separate by commas
        str_win_vals = str_win.split(',')
        # ====== frequency ======
        str_freqs = str_win_vals[0].split('..')
        str_freq_start = str_freqs[0]
        # remove 'GHz' unit (for now...)
        str_freq_end = str_freqs[1][:-3]
        flt_start = float(str_freq_start)
        flt_end = float(str_freq_end)
        # ====== resolution ======
        str_res = str_win_vals[1][:-3]
        flt_res = float(str_res)
        # ====== sensitivity (10 km/s) ======
        str_sens_10 = str_win_vals[2].split('/')[0][:-3]
        #print(str_sens_10)
        flt_sens_10 = float(str_sens_10)
        # ====== sensitivity (sensitivity_native) ======
        str_sens_nat = str_win_vals[3].split('/')[0][:-3]
        flt_sens_nat = float(str_sens_nat)
        # ====== polarization product ======
        str_pol_prod = str_win_vals[4]

        # create Observations from values
        new_window = SpectralWindow(
            start = flt_start,
            end = flt_end,
            resolution = flt_res,
            sensitivity_10kms = flt_sens_10,
            sensitivity_native = flt_sens_nat,
            pol_product = str_pol_prod
        )

        # add new observation to the list
        spec_win_list.append(new_window)

    return(spec_win_list)

def newObsFromRow(row, index):

    try:
        new_spectral_windows = newSpecWinFromRow(row['Frequency support'])
    except:
        print("Error parsing observation " + str(row["Project code"]) + "'s spectral windows (index " + str(index))
        return

    print(row['Project code'])
    new_observation = Observation(
        project_code = row['Project code'],
        source_name = row['Source name'],
        ra = row['RA'],
        dec = row['Dec'],
        gal_longitude = row['Galactic longitude'],
        gal_latitude = row['Galactic latitude'],
        spatial_resolution = row['Spatial resolution'],
        frequency_resolution = row['Frequency resolution'],
        # mosaic = ...
        integration_time = row['Integration'],
        release_date = convertDate(row['Release date']),
        velocity_resolution = row['Velocity resolution'],
        # pol_product = row[],
        observation_date = convertDateTime(row['Observation date']),
        pi_name = row['PI name'],
        sb_name = row['SB name'],
        proposal_authors = row['Proposal authors'],
        line_sensitivity = row['Line sensitivity (10 km/s)'],
        continuum_sensitivity = row['Continuum sensitivity'],
        pwv = row['PWV'],
        group_ous_id = row['Group ous id'],
        member_ous_id = row['Member ous id'],
        asdm_uid = row['Asdm uid'],
        project_title = row['Project title'],
        project_type = row['Project type'],
        scan_intent = row['Scan intent'],
        field_of_view = row['Field of view'],
        largest_angular_scale = row['Largest angular scale'],
        qa2_status = row['QA2 Status'],
        count = row['COUNT'],
        science_keywords = row['Science keyword'],
        scientific_cat = row['Scientific category'],
        asa_project_code = row['ASA_PROJECT_CODE']
    )

    new_observation.save()

    # handle band
    band_array = str(row["Band"]).split(" ")
    for i in range(len(band_array)):
        band = Band.objects.get(designation=int(band_array[i]))
        new_observation.bands.add(band)

    # handle arrays
    ant_array = list(filter(None, row["Array"].split("m")))
    for i in range(len(ant_array)):
        array = Array.objects.get(designation=ant_array[i])
        new_observation.arrays.add(array)

    # handle spectral coverage
    for i in range(len(new_spectral_windows)):
        curr_win = new_spectral_windows[i]
        curr_win.observation = new_observation
        curr_win.save()

    # handle traces
    new_trace = Trace(
        ra = row['RA'],
        dec = row['Dec'],
        fov = row['Field of view']
    )

    new_trace.observation = new_observation
    new_trace.save()

class Command(BaseCommand):
    args = '<coiso>'

    def _populate_test(self, start_index):

        addBands()
        addArrays()
        asa_file = pd.read_csv('C:/Users/anton/Documents/Faculdade/Tese/Projecto/almanext/Whole_ASAcat_metadata_Oct30th2019.csv')
        for index, row in asa_file.iloc[start_index:].iterrows():
            new_obs = newObsFromRow(row, index)

    def add_arguments(self, parser):
        parser.add_argument('start', type=int)

    def handle(self, *args, **options):
        start = options['start']
        self._populate_test(start)
