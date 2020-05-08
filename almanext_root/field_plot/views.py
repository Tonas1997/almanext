import numpy as np
from field_plot import json_builder
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from django.shortcuts import render
from django.http import JsonResponse
from common.models import Observation, SpectralWindow, Trace

ra_origin = 0
dec_origin = 0
inc = 0
minF = 0
maxF = 0

def index(request):
    #return HttpResponse("<h1>Hello world</h1>")
    return render(request, 'field_plot/main.html')

# Create your views here.
def get_plot(request, var_center, var_size, var_res, min_freq, max_freq):

    center = ["10h00m24s","+2:00"]
    size = 2
    res = 10

    min_freq = 85
    max_freq = 115

    # defines the center of the observation in the form of a SkyCoord object
    center = SkyCoord(var_center[0], var_center[1], unit=(u.hourangle, u.deg))
    coords = [center.ra.degree, center.dec.degree]

    min_ra = 148
    max_ra = 152
    min_dec = 0
    max_dec = 4

    obs_set = []

    # =============================================================================

    # get observations (NEEDS OVERHAUL, CURRENTLY IT ONLY FILTERS BY REGION, NOT FREQUENCY SUPPORT)
    query_result = Observation.objects.filter(ra > min_ra, ra < max_ra,dec > min_dec, dec < max_dec).prefetch_related('spec_windows').prefetch_related('traces')

# =============================================================================

    JSONplot = get_json_plot(center, size, res, query_result)

# =============================================================================
#     RETURN A JSON OBJECT
# =============================================================================

    return JsonResponse(JSONplot)
