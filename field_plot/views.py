import numpy as np
from utils import get_json_plot
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle

ra_origin = 0
dec_origin = 0
inc = 0
minF = 0
maxF = 0

# Create your views here.
def get_plot(request, var_center, size, res):
    
    var_center = ["10h00m24s","+2:00"]
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
    
    JSONplot = get_json_plot(cosmos_field, minF, maxF, center)
        
# =============================================================================
#     SERIALIZE AND RETURN A JSON OBJECT
# =============================================================================
