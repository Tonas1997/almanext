import numpy as np
from field_plot import utils
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
    return render(request, 'base.html')

# Create your views here.
def get_plot(request, var_center, var_size, var_res, min_freq, max_freq):

    center = ["10h00m24s","+2:00"]
    size = 2
    res = 10
    minF = 85
    maxF = 115

    # defines the center of the observation in the form of a SkyCoord object
    center = SkyCoord(var_center[0], var_center[1], unit=(u.hourangle, u.deg))
    coords = [center.ra.degree, center.dec.degree]

# =============================================================================
#    PLACEHOLDER: THIS PART OF THE CODE WILL FETCH ALL RELEVANT OBSERVATIONS
#    FROM TRE DATABASE

    obs_set = 15
# =============================================================================

    JSONplot = get_json_plot(center, size, res, obs_set)

# =============================================================================
#     RETURN A JSON OBJECT
# =============================================================================

    return JSONResponse(JSONplot)
