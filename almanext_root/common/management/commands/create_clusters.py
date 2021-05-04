from django.core.management.base import BaseCommand
from common.models import Observation, Trace
from sky_map.models import Cluster_0, Cluster_1, Overlap
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from sklearn.cluster import KMeans
from django.core.serializers.json import DjangoJSONEncoder

import pandas as pd
import math
import json

tolerance = 0.5 # in degrees

def create_clusters():
    obs_set = Observation.objects.all()
    df = pd.DataFrame.from_records(obs_set.values("ra", "dec"))
    print(df)

    kmeans = KMeans(n_clusters=int(len(df.index)/10))
    kmeans.fit(df)

    labels = kmeans.predict(df)
    centroids = kmeans.cluster_centers_

    clusters = pd.DataFrame(centroids, columns=["ra", "dec"])
    print(clusters)



def get_obs_areas():

    obs_set = Observation.objects.all()
    overlap_list = []
    obs_count = obs_set.count()
    index = 1

    for o1 in obs_set:
        if(index > 100):
            break
        print("Processing observation " + str(o1.project_code) + "... (" + str(index) + "/" + str(obs_count) + ") - " + str(round(index/obs_count*100, 2)) + "%")
        # get the coordinates and fov of the current observation
        c1 = SkyCoord(o1.ra, o1.dec, unit=(u.deg, u.deg), frame='icrs')
        f1 = Angle(o1.field_of_view, u.arcsec)
        t = Angle(tolerance, u.degree)
        # first-cut bounding box
        min_dec = o1.dec - t.degree
        max_dec = o1.dec + t.degree
        min_ra = o1.ra - Angle(math.asin(t.radian), u.radian).degree / math.cos(Angle(o1.dec, u.degree).radian)
        max_ra = o1.ra + Angle(math.asin(t.radian), u.radian).degree / math.cos(Angle(o1.dec, u.degree).radian)
        """print(min_dec)
        print(max_dec)
        print(min_ra)
        print(max_ra)"""
        cut_set = Observation.objects.filter(ra__gte = min_ra, ra__lte = max_ra, dec__gte = min_dec, dec__lte = max_dec)
        for o2 in cut_set:
            # get the coordinates and fov of the current surrounding observation
            c2 = SkyCoord(o2.ra, o2.dec, unit=(u.deg, u.deg), frame='icrs')
            f2 = o2.field_of_view
            # if the separation exceeds the sum of the radii of both observations, skip
            if(c1.separation(c2).arcsec > (f1.arcsec + f2)):
                continue
            else:
                print("############")
                area = calc_overlap(o1, o2)
                if(area != 0):
                    print("obs1: " + str(o1.project_code))
                    print("obs2: " + str(o2.project_code))
                    print("area: " + str(area))
                    overlap_json = {"obs1": o1.project_code, "obs2": o2.project_code, "area": area}
                    overlap_list.append(overlap_json)
        index += 1
    # insert all overlaps into the database at once
    json_builder = {"overlaps": overlap_list}
    with open('overlaps.json', 'w') as outfile:
        json.dump(json_builder, outfile, indent=4, cls=DjangoJSONEncoder)
    #objs = Overlap.objects.bulk_create(overlap_list)


def calc_overlap(obs1, obs2):

    traces1 = obs1.traces.all()
    traces2 = obs2.traces.all()

    area_i = 0
    area_1 = 0
    area_2 = 0

    for t1 in traces1:
        # get the radii and centers of each trace
        r1 = t1.fov / 2
        c1 = SkyCoord(t1.ra, t1.dec, unit=(u.deg, u.deg), frame='icrs')
        a1 = math.pi*r1**2
        area_1 += a1
        for t2 in traces2:
            # get the radii and centers of each trace
            r2 = t2.fov / 2
            c2 = SkyCoord(t2.ra, t2.dec, unit=(u.deg, u.deg), frame='icrs')
            a2 = math.pi*r2**2
            area_2 += a2

            # calculate intersection area
            sep = c1.separation(c2).arcsec

            if(sep > r1 + r2):
                continue
            # the next two cases are observed if one of the traces completely "engulfs" the other
            elif(sep + r2 < r1):
                area_i += math.pi*r2**2
            elif(sep + r1 < r2):
                area_i += math.pi*r1**2
            else:
                # formula for the intersection ("lens") between two circles
                area_i +=  1/2 * math.sqrt((-sep+r1-r2)*(-sep-r1+r2)*(-sep+r1+r2)*(sep+r1+r2))

            """ print("###############")
            print(t1.fov)
            print(t2.fov)
            print(sep)
            print(area)  
            #new_overlap = Overlap(obs1 = obs1, obs2 = obs2, area = area)
            #new_overlap.save()
            #obs1.overlaps_with.add(obs2)
            #obs2.overlaps_with.add(obs1) """
    
    print(area_1)
    print(area_2)
    return area_i

class Command(BaseCommand):
    args = '<coiso>'

    def _create_clusters(self):
        # start by clustering all observations by their location
        #obs_set = pd.DataFrame.from_records(Observation.objects.all().values('id', 'ra', 'dec'))
    
        #size1 = obs.count / 10
        #kmeans = KMeans(n_clusters=size1)
        #kmeans.fit(obs_set)
        #obs1 = Observation.objects.filter(source_name="NGC_3044", mosaic=0).first()
        #obs2 = Observation.objects.filter(source_name="NGC_3044", mosaic=1).last()
    
        create_clusters()

    def handle(self, *args, **options):
        self._create_clusters()