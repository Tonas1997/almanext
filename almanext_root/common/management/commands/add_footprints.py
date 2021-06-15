from sky_map.models import Overlap
from common.utils import footprint_to_polygon, calc_obs_areas
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.core.serializers.json import DjangoJSONEncoder
from common.models import Observation
from spherical_geometry.polygon import SphericalPolygon as sp
from astropy.coordinates import Angle
from astropy import units as u
import pandas as pd
import re
import math

MULT = 42545170301.5 # approximate number of square arcsecs in a steradian

def convert_date(str_date):
    print(str_date)
    if(isinstance(str_date, float) or str_date is None):
        return None
    date_vals = str(str_date).split('-')
    day = date_vals[2]
    month = date_vals[1]
    year = date_vals[0]
    return(day + "/" + month + "/" + year)

def fix_areas():
    obs_set = Observation.objects.filter(total_area__gte = MULT)
    for o in obs_set:
        # convert arcsec^2 to steradian for convenience (and accuracy!)
        steradian = o.total_area / MULT
        # "invert" the area by subtracting it from 4pi (the number of steradians in a sphere)
        fixed_area = 4*math.pi - steradian
        # convert the area back to arcsec^2
        o.total_area = fixed_area * MULT
        o.save()

def debug_obs_footprint(id):
    obs = Observation.objects.filter(pk=id)
    for o in obs:
        l = Angle(o.field_of_view*3, u.arcsec)
        print(l.radian)
        # first-cut bounding box
        min_dec = o.dec - l.degree
        max_dec = o.dec + l.degree
        if(l.radian < 1):
            min_ra = o.ra - Angle(math.asin(l.radian), u.radian).degree / math.cos(Angle(o.dec, u.degree).radian)
            max_ra = o.ra + Angle(math.asin(l.radian), u.radian).degree / math.cos(Angle(o.dec, u.degree).radian)
        else:
            min_ra = o.ra - Angle(l.radian, u.radian).degree / math.cos(Angle(o.dec, u.degree).radian)
            max_ra = o.ra + Angle(l.radian, u.radian).degree / math.cos(Angle(o.dec, u.degree).radian)
        # find all observations within the box
        print(min_ra)
        print(max_ra)
        cut_set = Observation.objects.filter(~Q(id=o.id), ra__gte = min_ra, ra__lte = max_ra, dec__gte = min_dec, dec__lte = max_dec)
        for o1 in cut_set:
            print(o.footprint)



class Command(BaseCommand):
    args = '<coiso>'

    def _test_footprints(self):
        obs = Observation.objects.filter(project_code = "2018.A.00051.S").first()
        footprint_to_polygon(obs.footprint)

    def _calc_obs_total_areas(self):
        obs_query = Observation.objects.filter(~Q(footprint=""), ~Q(footprint="nan"))
        for o in obs_query:
            print("###################")
            print(o)
            polygon = footprint_to_polygon(o.footprint)
            area = polygon.area() * MULT
            print(area)
            o.total_area = area
            o.save()
        fix_areas()

    def _load_footprints(self):
        asa_file_f = pd.read_csv('C:/Users/anton/Documents/Faculdade/Tese/Projecto/almanext/observation_1621344963.csv')
        for o in Observation.objects.filter(Q(footprint="")):
            print("##########################")
            print(o.project_code)
            date = convert_date(o.release_date)
            if(date is None):
                continue
            f_row = asa_file_f.loc[(asa_file_f["Project code"] == o.project_code) &
            (asa_file_f["ALMA source name"] == o.source_name) &
            (asa_file_f["Release date"] == date) &
            (asa_file_f["SB name"] == o.sb_name) &
            (asa_file_f["Member ous id"] == o.member_ous_id)]
            print(f_row)
            if(len(f_row) != 1):
                print("error")
                continue
            else:
                footprint = f_row["Footprint"].item()
                print(footprint)
                o.footprint = footprint
                o.save()

    def handle(self, *args, **options):
        self._calc_obs_total_areas()
