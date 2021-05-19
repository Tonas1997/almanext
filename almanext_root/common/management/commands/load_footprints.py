from django.core.management.base import BaseCommand
from django.db.models import Q
from spherical_geometry import polygon
from common.models import Observation
from spherical_geometry.polygon import SphericalPolygon as sp
import pandas as pd
import re

def convert_date(str_date):
    print(str_date)
    if(isinstance(str_date, float) or str_date is None):
        return None
    date_vals = str(str_date).split('-')
    day = date_vals[2]
    month = date_vals[1]
    year = date_vals[0]
    return(day + "/" + month + "/" + year)

def footprint_to_polygon(fp):
    # first, set the word to split the footprint with
    type = "Circle" if "Circle" in fp else "Polygon"
    fp_split = fp.split(type)
    # the polygons list
    polygon_list = []
    # iterate over all found footprints
    for f in fp_split:
        # remove all non-numeric characters but leave spaces intact
        non_num = re.sub("[^\d\. ]", "", f)
        # now we can remove the leading space :)
        non_num = non_num[1:]
        # check if this is the first (empty) row
        if(len(non_num) == 0):
            continue
        # at this point we can cast the list to float
        non_num = non_num.split()
        float_map = map(float, non_num)
        float_list = list(float_map) 
        # is this a circle?
        if(len(non_num) == 3):
            polygon = sp.from_cone(float_list[0], float_list[1], float_list[2])
        # else, it's a polygon
        else:
            # separate vertices into two lists, containing ra and dec values
            ra_list = float_list[::2]
            dec_list = float_list[1::2]
            # create the polygon!
            polygon = sp.from_radec(ra_list, dec_list)
        # regardless of type, append the new polygon to the list
        polygon_list.append(polygon)
    # finally, create the polygon from all polygons added to the list
    full_polygon = sp.multi_union(polygon_list)
    print(full_polygon.area())


class Command(BaseCommand):
    args = '<coiso>'

    def _test_footprints(self):
        obs = Observation.objects.filter(project_code = "2018.A.00051.S").first()
        footprint_to_polygon(obs.footprint)

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
        #self._load_footprints()
        self._test_footprints()