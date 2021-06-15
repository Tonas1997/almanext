
from django.core.management.base import BaseCommand
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Max

from common.models import Observation
from common.utils import calc_obs_areas_simple
from sky_map.models import Cluster, ObsRef

from sklearn.cluster import KMeans
import multiprocessing
import pandas as pd
import math
import json

tolerance = 0.5 # in degrees
MULT = 42545170301.5
FACTOR = 5

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

def get_all_cluster_obs_area():
    curr_max_level = Cluster.objects.all().aggregate(Max('level')).get('level__max')
    cluster_set = Cluster.objects.filter(processed = False)
    pool = multiprocessing.Pool()
    pool.map(get_cluster_obs_area, cluster_set)
    #for c in cluster_set:
    #    get_cluster_obs_area(c)

def get_cluster_obs_area(c):
    print(multiprocessing.current_process())
    if(c.level == 1):
        o_ref_set = ObsRef.objects.filter(parent = c)
        obs_set = Observation.objects.filter(pk__in = o_ref_set)
        areas = calc_obs_areas_simple(obs_set)
        u = fix_obs_area(areas.get("u_area"))
        i = fix_obs_area(areas.get("i_area"))
    else:
        children = Cluster.objects.filter(parent = c)
        u = 0
        i = 0
        for c1 in children:
            if(c1.processed == True):
                u += c1.area_total
                i += c1.area_overlap
            else:
                areas = get_cluster_obs_area(c1)
                u += fix_obs_area(areas.get("u_area"))
                i += fix_obs_area(areas.get("i_area"))
    c.area_total = u
    c.area_overlap = i
    c.processed = True
    c.save()
    areas = {"i_area" : i, "u_area": u}
    return areas

def get_all_cluster_obs_count():
    curr_max_level = Cluster.objects.all().aggregate(Max('level')).get('level__max')
    cluster_set = Cluster.objects.filter(level = curr_max_level)
    for c in cluster_set:
        get_cluster_obs_count(c)

def get_cluster_obs_count(c):
    count = 0
    if(c.level == 1):
        count = ObsRef.objects.filter(parent = c).count()
    else:
        children = Cluster.objects.filter(parent = c)
        for c1 in children :
            count += get_cluster_obs_count(c1)
            print(count)
    c.count = count
    c.save()
    return count

def create_cluster_json():
    # get the number of levels-of-detail
    curr_max_level = Cluster.objects.all().aggregate(Max('level')).get('level__max')
    # create two lists: one for the lod labels and another for the datapoints
    lod_list = []
    lod_names = []
    # build one lod at a time
    for i in range(0, curr_max_level + 1):
        lod_names.append("lod" + str(i))
        ls = []
        # if we're on level 0, add the ObsRef objects
        if(i == 0):
            obsref_set = ObsRef.objects.all()
            for oref in obsref_set:
                ls.append({
                    "id": oref.obs.id,
                    "project_code": oref.obs.project_code,
                    "ra": oref.obs.ra,
                    "dec": oref.obs.dec,
                    "total_area": oref.obs.total_area
                })
        # else, add the Cluster objects
        else:
            cluster_set = Cluster.objects.filter(level = i)
            for c in cluster_set:
                ls.append({
                    "ra": c.ra,
                    "dec": c.dec,
                    "n_obs": c.count
                })
        lod_list.append(ls)
    # create a dict from both lists
    cluster_zip = dict(zip(lod_names, lod_list))
    print(cluster_zip)
    with open('cluster.json', 'w') as outfile:
        json.dump(cluster_zip, outfile, indent=4, cls=DjangoJSONEncoder)


def create_clusters():
    # how many levels do we need?
    obs_set = Observation.objects.filter(total_area__gt = 0.0)
    lod_levels = max(math.floor(math.log(obs_set.count(), FACTOR)) - 2, 0)
    if(Cluster.objects.all().count() != 0):
        curr_max_level = Cluster.objects.all().aggregate(Max('level')).get('level__max')
    else:
        curr_max_level = 0

    # create cluster levels
    for i in range(curr_max_level + 1, lod_levels + 1):
        # lowest level: we will cluster directly from observation refs
        if(i == 1):
            # only select observations whose polygons have been successfuly used
            set = Observation.objects.filter(total_area__gt = 0.0)
            df = pd.DataFrame.from_records(set.values("ra", "dec"))
            kmeans = KMeans(n_clusters=int(len(df.index)/FACTOR*i))
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
            orf_create = ObsRef.objects.bulk_create(orf_list)
            # NOW we can start measuring areas!
            # get_lod1_obs_areas()'''
        else:
            # get all clusters from the previous level to create new ones with
            set = Cluster.objects.filter(level = i - 1)
            df = pd.DataFrame.from_records(set.values("ra", "dec"))
            kmeans = KMeans(n_clusters=int(len(df.index)/FACTOR*i))
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
                c.save()

class Command(BaseCommand):
    args = '<coiso>'

    def handle(self, *args, **options):
        #create_clusters()
        get_all_cluster_obs_area()
        #create_cluster_json()
