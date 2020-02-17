import numpy as np
from utils import get_json_plot
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from django.http import JSONResponse
from almanext_site.common.models import Observation, SpectralWindow, Trace

ra_origin = 0
dec_origin = 0
inc = 0
minF = 0
maxF = 0

# Create your views here.
def get_plot(request, var_center, var_size, var_res):

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

    obs_set = 
# =============================================================================

    JSONplot = get_json_plot(center, size, res, obs_set)

# =============================================================================
#     RETURN A JSON OBJECT
# =============================================================================

    return JSONResponse(JSONplot)
