from astropy.coordinates.sky_coordinate import SkyCoord
from django.core.management.base import BaseCommand
from numpy.lib.utils import source
from pandas.core import frame
from common.models import Observation, Trace
from sky_map.models import Cluster, ObsRef, Overlap
from astropy import units as u
from astropy import coordinates, units as u
from sklearn.cluster import KMeans
from django.core.serializers.json import DjangoJSONEncoder
from astroquery.alma import utils, Alma
from common.utils import calc_obs_areas
from django.db.models import Max

import pandas as pd
import math
import json

tolerance = 0.5 # in degrees
MULT = 42545170301.5

def fix_obs_area(area):
    radians = area / MULT
    if(radians > 1):
        true_radians = 4 * math.pi - radians
        return true_radians * MULT
    else:
        return area

def get_lod1_obs_areas():
    c_list = Cluster.objects.filter(level = 1, processed = False)
    print(c_list)
    for c in c_list:
        print(c.id)
        o_ref_set = ObsRef.objects.filter(parent = c)
        obs_set = Observation.objects.filter(pk__in = o_ref_set)
        areas = calc_obs_areas(obs_set)
        print(areas)
        #c.area_total = areas.get("union")
        c.area_overlap = fix_obs_area(areas.get("intersection"))
        c.processed = True
        c.save()

def get_cluster_obs_count(c):
    count = 0
    if(c.level == 1):
        count = ObsRef.objects.filter(parent = c).count()
    else:
        children = Cluster.objects.filter(parent = c)
        for c in children :
            count += get_cluster_obs_count(c)
    c.count = count
    c.save()
    return count


def create_clusters():
    #firstly, create the obs_link objects

    '''obs_set = Observation.objects.filter(total_area__gt = 0.0)
    df_id = pd.DataFrame.from_records(obs_set.values("id"))
    df = pd.DataFrame.from_records(obs_set.values("ra", "dec"))
    print(df)

    kmeans = KMeans(n_clusters=int(len(df.index)/10))
    kmeans.fit(df)

    labels = kmeans.labels_
    centroids = kmeans.cluster_centers_

    obs_clusters = pd.DataFrame()
    obs_clusters["obs"] = df_id["id"]
    obs_clusters["cluster"] = labels

    clusters = pd.DataFrame(centroids, columns=["ra", "dec"])

    print(clusters)
    print(obs_clusters)'''

    # how many levels do we need?
    obs_set = Observation.objects.filter(total_area__gt = 0.0)
    lod_levels = max(math.floor(math.log10(obs_set.count())) - 2, 0)
    curr_max_level = Cluster.objects.all().aggregate(Max('level')).get('level__max')

    # create cluster levels
    for i in range(curr_max_level + 1, lod_levels + 1):
        # lowest level: we will cluster directly from observation refs
        if(i == 1):
            # only select observations whose polygons have been successfuly used
            set = Observation.objects.filter(total_area__gt = 0.0)
            df = pd.DataFrame.from_records(set.values("ra", "dec"))
            kmeans = KMeans(n_clusters=int(len(df.index)/10*i))
            kmeans.fit(df)
            centroids = kmeans.cluster_centers_
            clusters = pd.DataFrame(centroids, columns=["ra", "dec"])
            # create a cluster list to add all clusters to the DB at once
            c_list = []
            for j, row in clusters.iterrows():
                # create a new cluster and append it to the cluster list (duh)
                c = Cluster(level = i, ra = row["ra"], dec = row["dec"], area_total = 0, area_overlap = 0)
                c_list.append(c)
            # add all clusters to the database
            c_create = Cluster.objects.bulk_create(c_list)
            # now we need to know which cluster an observation belongs to
            df_id = pd.DataFrame.from_records(set.values("id"))
            labels = kmeans.labels_
            obs_clusters = pd.DataFrame()
            obs_clusters["obs"] = df_id["id"]
            obs_clusters["cluster"] = labels
            # iterate through the dataframe and create obs_links
            orf_list = []
            for i, row in obs_clusters.iterrows():
                orf = ObsRef(parent = Cluster.objects.get(pk=int(row["cluster"])+1), obs = Observation.objects.get(pk=int(row["obs"])))
                orf_list.append(orf)
            #orf_create = ObsRef.objects.bulk_create(orf_list)
            # NOW we can start measuring areas!
            # get_lod1_obs_areas()'''
        else:
            # get all clusters from the previous level
            set = Cluster.objects.filter(level = i - 1)
            df = pd.DataFrame.from_records(set.values("ra", "dec"))
            kmeans = KMeans(n_clusters=int(len(df.index)/10*i))
            kmeans.fit(df)
            centroids = kmeans.cluster_centers_
            clusters = pd.DataFrame(centroids, columns=["ra", "dec"])
            # create a cluster list to add all clusters to the DB at once
            c_list = []
            for j, row in clusters.iterrows():
                # create a new cluster and append it to the cluster list (duh)
                c = Cluster(level = i, ra = row["ra"], dec = row["dec"], area_total = 0, area_overlap = 0)
                c_list.append(c)
            # before creating the new clusters, get the current number of rows to offset the labels later
            cluster_count = Cluster.objects.all().count()
            # add all clusters to the database
            c_create = Cluster.objects.bulk_create(c_list)
            df_id = pd.DataFrame.from_records(set.values("id"))
            labels = kmeans.labels_
            # we need to correct the cluster labels for the IDs to match
            corrected_labels = list(map(lambda x: x + cluster_count + 1, labels))
            print(labels)
            print(corrected_labels)
            c_clusters = pd.DataFrame()
            c_clusters["child"] = df_id["id"]
            c_clusters["parent"] = corrected_labels
            print(c_clusters)
            # iterate through the dataframe and link clusters to their parents
            for i, row in c_clusters.iterrows():
                print(str(row["child"]) + str(row["parent"]))
                c = Cluster.objects.get(pk = int(row["child"]))
                c.parent = Cluster.objects.get(pk = int(row["parent"]))
                #c.save()


    # create first-level references
    #for index, row in obs_clusters.iterrows():



class Command(BaseCommand):
    args = '<coiso>'

    def handle(self, *args, **options):
        create_clusters()
        #get_lod1_obs_areas()
