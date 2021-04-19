from django.db import models
from common.models import Observation, SpectralWindow, Trace

# largest blobs - each contains 10 level-1 blobs, or 100 observations
class Cluster_0(models.Model):
    ra = models.FloatField()
    dec = models.FloatField()
    area_total = models.FloatField()
    area_overlap = models.FloatField()


# level 1 - each contains 10 observations
class Cluster_1(models.Model):
    parent = models.ForeignKey(Cluster_0, on_delete=models.CASCADE, null=True, related_name='children')
    ra = models.FloatField()
    dec = models.FloatField()
    area_total = models.FloatField()
    area_overlap = models.FloatField()

class Overlap(models.Model):
    obs1 = models.ForeignKey(Observation, on_delete=models.CASCADE, null=True, related_name='obs_1')
    obs2 = models.ForeignKey(Observation, on_delete=models.CASCADE, null=True, related_name='obs_2')
    area_num = models.FloatField()

