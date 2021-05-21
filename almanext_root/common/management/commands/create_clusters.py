from astropy.coordinates.sky_coordinate import SkyCoord
from django.core.management.base import BaseCommand
from numpy.lib.utils import source
from pandas.core import frame
from common.models import Observation, Trace
from sky_map.models import Cluster_0, Cluster_1, Overlap
from astropy import units as u
from astropy import coordinates, units as u
from sklearn.cluster import KMeans
from django.core.serializers.json import DjangoJSONEncoder
from astroquery.alma import utils, Alma

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

class Command(BaseCommand):
    args = '<coiso>'

    def handle(self, *args, **options):