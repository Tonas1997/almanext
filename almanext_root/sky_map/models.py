from django.db import models
from common.models import Observation, SpectralWindow, Trace

class Cluster(models.Model):
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, related_name='children')
    level = models.IntegerField()
    ra = models.FloatField()
    dec = models.FloatField()
    area_total = models.FloatField()
    area_overlap = models.FloatField()
    processed = models.BooleanField(default = False)
    count = models.IntegerField(default=0)

class ObsRef(models.Model):
    parent = models.ForeignKey(Cluster, on_delete=models.CASCADE, null=True, related_name='cluster_obs')
    obs = models.ForeignKey(Observation, on_delete=models.CASCADE, null=True, related_name='obs')

class Overlap(models.Model):
    obs1 = models.ForeignKey(Observation, on_delete=models.CASCADE, null=True, related_name='obs_1')
    obs2 = models.ForeignKey(Observation, on_delete=models.CASCADE, null=True, related_name='obs_2')
    area_num = models.FloatField()
