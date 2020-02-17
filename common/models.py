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
    array = models.IntegerField(choices = (ARRAY_CHOICES))
    # to be defined
    mosaic = models.ForeignKey(Trace)
    integration_time = models.FloatField()
    release_date = models.CharField()
    freq_support = models.ForeignKey(SpectralWindow)
    velocity_resolution = models.FloatField()
    pol_product = models.CharField(choices = (POL_PRODUCT_CHOICES))
    observation_date = models.DateTimeField()
    pi_name = models.CharField()
    sb_name = models.CharField()
    proposal_authors = models.CharField()
    line_sensitivity = models.FloatField()
    continuum_sensitivity = models.FloatField()
    pwv = models.FloatField()
    group_ous_id
    member_ous_id
    asdm_uid
    project_title = models.CharField()
    project_type
    scan_intent
    field_of_view = models.CharField()
    largest_angular_scale = models.CharField()
    qa2_status = models.CharField(max_length = 1)
    count = models.FloatField()
    science_keywords
    scientific_cat
    asa_project_code = models.CharField()

    def __str__(self):
        return self.project_code

class SpectralWindow(models.Model):
    start = models.FloatField()
    end = models.FloatField()
    resolution = models.FloatField()
    sensitivity_10kms = models.FloatField()
    sensitivity_native = models.FloatField()
    pol_product = models.CharField(choices = POL_PRODUCT_CHOICES)

class Trace(models.Model):
    ra = models.FloatField()
    dec = models.FloatField()

# =============== CHOICES ===============

ARRAY_CHOICES = (
    (7, '7m'),
    (12, '12m'),
)

POL_PRODUCT_CHOICES = (
    ('XX YY', 'XX YY'),
    ('XX', 'XX'),
    ('XX XY YX YY', 'XX XY YX YY')
)
