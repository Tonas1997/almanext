import numpy as np
from utils import arcsecToAngle, fillPixels
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
# =============================================================================
    
    # get the coordinates for the top-left corner
    ra_origin = float(center.ra.degree) - float((size/2)) + arcsecToAngle(res/2)
    dec_origin = float(center.dec.degree) + float((size/2)) - arcsecToAngle(res/2)
    
    # get number of pixels
    angle_size = Angle(size, unit=u.degree)
    angle_res = Angle(res, unit=u.arcsec)
    max_len = int((angle_size/angle_res))
    # create 2D plot
    obs_array = np.zeros((max_len, max_len))
    inc = angle_res.degree
    
    count = 0
    
    # fill pixels
    for index, row in cosmos_field.iterrows():
        print("Processing observation " + str(row["Project code"]) + "(" + str(round(float(count/datasize), 2)*100) + "%)")
        ra = row["RA"]
        dec = row["Dec"]
        fov = row["Field of view"]
        fillPixels(ra, dec, fov)
        count += 1
        
# =============================================================================
#     SERIALIZE AND RETURN A JSON OBJECT
# =============================================================================
