from django.db.models import Q
from django.db.models import Max
from common.models import Observation
from spherical_geometry.polygon import SphericalPolygon as sp
from astropy.coordinates import Angle
from astropy import units as u
import math
import re

MULT =  42545170301.5 # acrsec^2 in a steradiam

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

def calc_obs_areas_simple(obs_set):
    # create union and intersection polgyon lists
    super_union_list = []
    super_intersection_list = []
    added_ids = []
    # iterate over the given queryset
    for o in obs_set:
        if(o.footprint == "" or o.footprint == "nan"):
            continue
        print("###############################################")
        # get the observation's polygon
        poly = footprint_to_polygon(o.footprint)
        if(o.id not in added_ids):
            super_union_list.append(poly)
            added_ids.append(o.id)
        print("Observation " + str(o) + " has an area of " + str(sp.area(poly)*MULT) + " arcsec2")
        # get all observations within the set that aren't this one
        cut_set = obs_set.filter(~Q(id=o.id))
        for o1 in cut_set:
            if(o1.footprint == "" or o1.footprint == "nan"):
                continue
            print("Processing observation " + str(o1))
            # calculate union and intersection
            poly1 = footprint_to_polygon(o1.footprint)
            if(o1.id not in added_ids):
                super_union_list.append(poly1)
                added_ids.append(o.id)
            overlap = poly.intersection(poly1)
            i_area = sp.area(overlap)
            if(i_area > 0):
                super_intersection_list.append(overlap)

    i_area = 0 if not super_intersection_list else sp.area(sp.multi_union(super_intersection_list)) * MULT
    u_area = 0 if not super_union_list else sp.area(sp.multi_union(super_union_list)) * MULT
    print("Union: " + str(u_area) + " - Intersection: " + str(i_area) + " arcsec2")
    areas = {"i_area" : i_area, "u_area": u_area}
    return areas


def calc_obs_areas(obs_set):
    # general query
    obs_size = obs_set.last().id
    print(obs_size)
    print(obs_set.count())
    # define a polygon list to avoid unnecessary work
    #poly_list = [None] * Observation.objects.all().count()
    # these lists will contain the polygons to calculate total coverage/overlapping areas
    super_union_list = []
    super_intersection_list = []
    for o in obs_set:
        if(o.footprint == "" or o.footprint == "nan"):
            continue
        print("###############################################")
        # if this polygon's footprint has not been processed before, do so
        '''poly = poly_list[o.id - 1]
        if(poly is None):
            # create the polygon and add it to the lists
            poly = footprint_to_polygon(o.footprint)
            poly_list[o.id - 1] = poly
            super_union_list.append(poly)'''
        poly = footprint_to_polygon(o.footprint)
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
        cut_set = Observation.objects.filter(~Q(id=o.id), ra__gte = min_ra, ra__lte = max_ra, dec__gte = min_dec, dec__lte = max_dec, pk__in = obs_set)
        ov_list = []
        for o1 in cut_set:
            if(o1.footprint == "" or o1.footprint == "nan"):
                continue
            #poly1 = poly_list[o1.id - 1]
            print("Processing observation " + str(o1))
            '''if(poly1 is None):
                # create the polygon and add it to the lists
                poly1 = footprint_to_polygon(o1.footprint)
                poly_list[o1.id - 1] = poly1
                super_union_list.append(poly1)'''
            poly1 = footprint_to_polygon(o1.footprint)
            super_union_list.append(poly1)
            # determine the intersection polygon and its area
            overlap = poly.intersection(poly1)
            i_area = sp.area(overlap)
            # if there's any intersection, add it to the list and the overlap table!
            if(i_area > 0):
                super_intersection_list.append(overlap)
                '''print("OVERLAP: " + str(o1) + " : " + str(i_area*MULT) + " arcsec2")
                ov = Overlap(obs1 = o, obs2 = o1, area_num = i_area * MULT)
                ov_list.append(ov)
        # create all overlaps in bulk
        ov_create = Overlap.objects.bulk_create(ov_list)
        print("COMPLETE!")'''

    print("calculating union...")
    # calculate the total covered and total overlapping areas
    #super_union = sp.multi_union(super_union_list)
    print("calculating intersection...")

    i_area = 0 if not super_intersection_list else sp.area(sp.multi_union(super_intersection_list)) * MULT
    u_area = 0 if not super_union_list else sp.area(sp.multi_union(super_union_list)) * MULT

    areas = {"i_area" : i_area, "u_area": u_area}
    return areas
