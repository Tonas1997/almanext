from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from pixel import Pixel

# global vars
obs_array = None
inc = 0
ra_origin = 0
dec_origin = 0
json_global
curr_freq = 0

curr_pixel = Pixel()

# simple converter, might be discontinued
def arcsec_to_angle(arcsec):
    return arcsec / 3600

# =============================================================================
#       MAIN FUNCTION, EVERYONE ELSE SUCKS
#       returns a json file with all relevant information
# =============================================================================

def get_json_plot(cosmos_field, minF, maxF, center):
    # auxiliary variables
    ra_origin = float(center.ra.degree) - float((size/2)) + arcsec_to_angle(res/2)
    dec_origin = float(center.dec.degree) + float((size/2)) - arcsec_to_angle(res/2)
    
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

    # convert full 2d array to json

# -----------------------------------------------------------------------------------------
# modifies the observation array, whether by adding a new pixel or modyfing an existing one

def add_or_change(i, j, new_pixel):
    position = obs_array[i][j] 
    if(position == None):
        position = pixel
    else:
        # calculate new values for that pixel
        position.n_obs = n_obs + 1
        position.avg = new_pixel
        #   # mais coisas...

# -----------------------------------------------------------------------------------------
# fills the pixels around given ra/dec coordinates and a fov measured in arcsecs

def fillPixels(ra, dec, fov):
    # create temp pixel object
    set_curr_pixel('args')
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
                # call to add_or_change
                add_or_change(i, j, curr_pixel)

# -----------------------------------------------------------------------------------------
# builds the final JSON file to expedite

def add_to_json(pixel):
    json_pixel = {
        "ra" : pixel.ra,
        "dec" : pixel.dec,
        "avg_freq" : pixel.freq,

    }
    json_global = json.dumps