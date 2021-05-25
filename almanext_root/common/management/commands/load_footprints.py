from sky_map.models import Overlap
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

MULT = 4.255 * 10**10 # approximate number of square arcsecs in a steradian

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
    obs_set = Observation.objects.filter(total_area__gte = 1)
    for o in obs_set:
        # "invert" the area by subtracting it from 4pi (the number of steradians in a sphere)
        fixed_area = 4*math.pi - o.total_area
        o.total_area = fixed_area
        o.save()

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
            polygon = sp.from_cone(float_list[0], float_list[1], float_list[2], steps=32)
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
    return sp.multi_union(polygon_list)

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

def calc_obs_areas(start):
    # general query
    obs_list = Observation.objects.filter(pk__gte=start)
    obs_size = Observation.objects.all().count()
    # define a polygon list to avoid unnecessary work
    poly_list = [None] * obs_size
    # these lists will contain the polygons to calculate total coverage/overlapping areas
    super_union_list = []
    super_intersection_list = []
    for o in obs_list:
        if(o.footprint == "" or o.footprint == "nan"):
            continue
        print("###############################################")
        # if this polygon's footprint has not been processed before, do so
        poly = poly_list[o.id - 1]
        if(poly is None):
            # create the polygon and add it to the lists
            poly = footprint_to_polygon(o.footprint)
            poly_list[o.id - 1] = poly
            super_union_list.append(poly)
        print("Observation " + str(o) + " has an area of " + str(sp.area(poly)*MULT) + " arcsec2")
        # after the polygon is set, calculate overlaps
        l = Angle(o.field_of_view*3, u.arcsec)
        # first-cut bounding box
        min_dec = o.dec - l.degree
        max_dec = o.dec + l.degree
        # the more accurate solution (only works if fov*3 < i rad)
        if(l.radian < 1):
            min_ra = o.ra - Angle(math.asin(l.radian), u.radian).degree / math.cos(Angle(o.dec, u.degree).radian)
            max_ra = o.ra + Angle(math.asin(l.radian), u.radian).degree / math.cos(Angle(o.dec, u.degree).radian)
        else:
            min_ra = o.ra - Angle(l.radian, u.radian).degree / math.cos(Angle(o.dec, u.degree).radian)
            max_ra = o.ra + Angle(l.radian, u.radian).degree / math.cos(Angle(o.dec, u.degree).radian)
        # find all observations within the box
        cut_set = Observation.objects.filter(~Q(id=o.id), ra__gte = min_ra, ra__lte = max_ra, dec__gte = min_dec, dec__lte = max_dec)
        ov_list = []
        for o1 in cut_set:
            if(o1.footprint == "" or o1.footprint == "nan"):
                continue
            poly1 = poly_list[o1.id - 1]
            print("Processing observation " + str(o1))
            if(poly1 is None):
                # create the polygon and add it to the lists
                poly1 = footprint_to_polygon(o1.footprint)
                poly_list[o1.id - 1] = poly1
                super_union_list.append(poly1)
            # determine the intersection polygon and its area
            overlap = poly.intersection(poly1)
            i_area = sp.area(overlap)
            # if there's any intersection, add it to the list and the overlap table!
            if(i_area > 0):
                super_intersection_list.append(overlap)
                print("OVERLAP: " + str(o1) + " : " + str(i_area*MULT) + " arcsec2")
                ov = Overlap(obs1 = o, obs2 = o1, area_num = i_area * MULT)
                ov_list.append(ov)
        # create all overlaps in bulk
        ov_create = Overlap.objects.bulk_create(ov_list)
        print("COMPLETE!")

    # calculate the total covered and total overlapping areas
    super_union = sp.multi_union(super_union_list)
    super_intersection = sp.multi_union(super_intersection_list)

    json_properties = {"total_area": sp.area(super_union * MULT), "overlap_area" : sp.area(super_intersection * MULT)}

    with open('areas.json', 'w') as outfile:
        json.dump(json_properties, outfile, indent=4, cls=DjangoJSONEncoder)


class Command(BaseCommand):
    args = '<coiso>'

    def _test_footprints(self):
        obs = Observation.objects.filter(project_code = "2018.A.00051.S").first()
        footprint_to_polygon(obs.footprint)

    def _calc_obs_total_areas(self):
        obs_query = Observation.objects.filter(~Q(footprint=""), ~Q(footprint="nan"), total_area = 0)
        for o in obs_query:
            print("###################")
            print(o)
            polygon = footprint_to_polygon(o.footprint)
            area = polygon.area()
            print(area)
            o.total_area = area
            o.save()

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
        calc_obs_areas(34867)
        #debug_obs_footprint(4501)
