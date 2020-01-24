from django.db import models

# Create your models here.
class Observation(models.Model):
    project_code = models.CharField()
    source_name = models.CharField()
    ra = models.FloatField()
    dec = models.FloatField()
    gal_longitude = models.FloatField()
    gal_latitude = models.FloatField()
    band = models.IntegerField()
    spatial_resolution = models.FloatField()
    frequency_resolution = models.FloatField()
    array
    mosaic
    integration_time = models.FloatField()
    release_date = models.CharField()
    freq_support
    velocity_resolution = models.FloatField()
    pol_product
    observation_date = models.DateTimeField()
    pi_name = models.CharField()
    sb_name = models.CharField()
    proposal_authors = models.CharField()
    line_sensitivity = models.FloatField()
    continuum_sensitivity = v
    pwv = models.FloatField()
    group_ous_id
    member_ous_id
    asdm_uid
    project_title = models.CharField()
    project_type
    scan_intent
    field_of_view
    largest_angular_scale
    qa2_status
    count
    science_leywords
    scientific_cat
    asa_project_code = models.CharField()
