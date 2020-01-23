from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from views import ra_origin, dec_origin, inc, minF, maxF, obs_array, max_len

# pixel class
class Pixel:
    ra = 0
    dec = 0
    avg_freq = 0
    avg_sensitivity = 0
    # ...

    def __init__(self, ra, dec)

# global vars
obs_array = None
inc = 0
ra_origin = 0
dec_origin = 0

# simple converter, might be discontinued
def arcsecToAngle(arcsec):
    return arcsec / 3600

def get_json_plot(cosmos_field, minF, maxF, center):
    # auxiliary variables
    ra_origin = float(center.ra.degree) - float((size/2)) + arcsecToAngle(res/2)
    dec_origin = float(center.dec.degree) + float((size/2)) - arcsecToAngle(res/2)
    
    # get number of pixels
    angle_size = Angle(size, unit=u.degree)
    angle_res = Angle(res, unit=u.arcsec)
    global max_len = int((angle_size/angle_res))

    # create 2D plot
    global obs_array = np.zeros((max_len, max_len))
    global inc = angle_res.degree

    # iterate over the QuerySet object
    for index, row in cosmos_field.iterrows():
        ra = row["RA"]
        dec = row["Dec"]
        fov = row["Field of view"]
        fillPixels(ra, dec, fov)


# fills the pixels around given ra/dec coordinates and a fov measured in arcsecs
def fillPixels(ra, dec, fov):
    # builds an Angle object for convenience
    fov_degree = Angle(fov, unit=u.arcsec)
    # define some support variables and the subgrid
    radius = int(fov_degree.degree / inc)
    center = SkyCoord(ra*u.degree, dec*u.degree, frame='icrs')
    centerX = int(abs(ra - ra_origin) / inc)
    centerY = int(abs(dec - dec_origin) / inc)
    topLeft = [int(max(0, centerX - radius - 1)), int(max(0, centerY - radius - 1))]
    bottomRight = [int(min(max_len - 1, centerX + radius + 1)), int(min(max_len - 1, centerY + radius + 1))]
    # fills the pixels of the subgrid
    for i in range(topLeft[0], bottomRight[0] + 1):
        for j in range(topLeft[1], bottomRight[1] + 1):
            # get the current cell coordinates
            currX = ra_origin + i*inc
            currY = dec_origin - j*inc
            currCoord = SkyCoord(currX*u.degree, currY*u.degree, frame='icrs')
            # see if the current cell falls within the observation fov
            sep = center.separation(currCoord)
            if(sep < fov_degree):
# =============================================================================
#                 this can be easily replaced with any other function - most
#                 likely, it will serialize data to populate a JSON file with
# =============================================================================
                obs_array[i][j] += 1
            # optional code block for visual antialias
            elif((sep - fov_degree) < Angle(square_size/2, unit=u.degree)): 
                obs_array[i][j] += fov_degree/sep