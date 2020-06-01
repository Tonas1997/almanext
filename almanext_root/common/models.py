from django.db import models
from common.class_observation import ObservationClass
from common.class_spectral_window import SpectralWindowClass
from common.class_trace import TraceClass

# =============== CHOICES ===============

ARRAY_CHOICES = (
    ('12', '12m'),
    ('7', '7m'),
    ('TP', 'Total power')
)

POL_PRODUCT_CHOICES = (
    ('XX YY', 'XX YY'),
    ('XX', 'XX'),
    ('XX XY YX YY', 'XX XY YX YY')
)

PROJECT_TYPE_CHOICES = (
    ('CAL', 'CAL'),
    ('L', 'L'),
    ('S', 'S'),
    ('SIM', 'SIM'),
    ('SV', 'SV'),
    ('T', 'T'),
    ('V', 'V'),
)

class Band(models.Model):
    designation = models.IntegerField()
    start = models.FloatField()
    end = models.FloatField()

class Array(models.Model):
    designation = models.CharField(max_length=2, choices = ARRAY_CHOICES)

# Create your models here.
class Observation(models.Model):
    project_code = models.CharField(max_length=14)
    source_name = models.CharField(max_length=50)
    ra = models.FloatField()
    dec = models.FloatField()
    gal_longitude = models.FloatField()
    gal_latitude = models.FloatField()
    bands = models.ManyToManyField(Band)
    spatial_resolution = models.FloatField()
    frequency_resolution = models.FloatField()
    arrays = models.ManyToManyField(Array)
    integration_time = models.FloatField()
    release_date = models.DateField(null=True, blank=True)
    velocity_resolution = models.FloatField()
    pol_product = models.CharField(max_length=11, choices = POL_PRODUCT_CHOICES)
    observation_date = models.DateTimeField()
    pi_name = models.CharField(max_length=50)
    sb_name = models.CharField(max_length=50)
    proposal_authors = models.CharField(max_length=400)
    line_sensitivity = models.FloatField()
    continuum_sensitivity = models.FloatField()
    pwv = models.FloatField()
    group_ous_id = models.CharField(max_length=50)
    member_ous_id = models.CharField(max_length=50)
    asdm_uid = models.CharField(max_length=50)
    project_title = models.CharField(max_length=800)
    project_type = models.CharField(max_length=3, choices = PROJECT_TYPE_CHOICES)
    scan_intent = models.CharField(max_length=30)
    field_of_view = models.FloatField()
    largest_angular_scale = models.FloatField()
    qa2_status = models.CharField(max_length=1)
    count = models.FloatField()
    science_keywords = models.CharField(max_length=50)
    scientific_cat = models.CharField(max_length=100)
    asa_project_code = models.CharField(max_length=14)

    def __str__(self):
        return self.project_code


class SpectralWindow(models.Model):
    start = models.FloatField()
    end = models.FloatField()
    resolution = models.FloatField()
    sensitivity_10kms = models.FloatField()
    sensitivity_native = models.FloatField()
    pol_product = models.CharField(max_length=11, choices = POL_PRODUCT_CHOICES)
    observation = models.ForeignKey(Observation, on_delete=models.CASCADE, null=True, related_name='spec_windows')

    def to_class(self):
        return SpectralWindowClass(self.start, self.end, self.resolution, self.sensitivity_10kms, self.sensitivity_native, self.pol_product)

class Trace(models.Model):
    ra = models.FloatField()
    dec = models.FloatField()
    fov = models.FloatField()
    observation = models.ForeignKey(Observation, on_delete=models.CASCADE, null=True, related_name='traces')

    def __str__(self):
        return(str(self.ra) + ", " + str(self.dec) + ", " + str(self.fov) + " arcsec")
