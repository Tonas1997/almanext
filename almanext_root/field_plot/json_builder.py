import json
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from field_plot.class_pixel import Pixel
from common.class_observation import ObservationClass
from common.class_spectral_window import SpectralWindowClass

# global vars
pix_array = None
inc = 0
ra_origin = 0
dec_origin = 0
curr_freq = 0

# -----------------------------------------------------------------------------------------
# simple converter, might be discontinued
def arcsec_to_angle(arcsec):
    return arcsec / 3600

def gridToCoords(i, j):
    return((ra_origin + i*inc + inc/2, dec_origin - j*inc + inc/2))

# -----------------------------------------------------------------------------------------
# appends a pixel to the final JSON object
def appendPixel(x, y, ra, dec, count_obs, avg_res, avg_sens, avg_int_time, observations):
    pix_list.append({"x" : x,
                         "y" : y,
                         "RA" : ra,
                         "Dec" : dec,
                         "count_obs" : count_obs,
                         "avg_res" : avg_res,
                         "avg_sens" : avg_sens,
                         "avg_int_time" : avg_int_time,
                         "observations" : observations})

# -----------------------------------------------------------------------------------------
# fills the pixels around given ra/dec coordinates and a fov measured in arcsecs

def fillPixels(ra, dec, fov, res, sens, int_time):
    # builds an Angle object for convenience
    fov_degree = Angle(fov, unit=u.arcsec)
    fov_degree = fov_degree/2
    # define some support variables and the subgrid
    radius = int(fov_degree.degree / inc)
    center = SkyCoord(ra*u.degree, dec*u.degree, frame='icrs')
    # (ra,dec)
    centerX = int(abs(ra - ra_origin) / inc)
    centerY = int(abs(dec - dec_origin) / inc)
    topLeft = [int(max(0, centerX - radius - 1)), int(max(0, centerY - radius - 1))]
    bottomRight = [int(min(max_len - 1, centerX + radius + 1)), int(min(max_len - 1, centerY + radius + 1))]
    # fills the pixels of the subgrid
    for y in range(topLeft[1], bottomRight[1] + 1):
        for x in range(topLeft[0], bottomRight[0] + 1):
            # get the current cell coordinates
            coords = gridToCoords(x, y)
            currCoord = SkyCoord(coords[0]*u.degree, coords[1]*u.degree, frame='icrs')
            # see if the current cell falls within the observation fov
            sep = center.separation(currCoord)
            if(sep < fov_degree):
                pixel = pix_array[y][x]
                if(pixel is None):
                    new_pixel = Pixel(x, y, currCoord.ra.degree, currCoord.dec.degree)
                    pix_array[y][x] = new_pixel
                pix_array[y][x].change_avgs(res, sens, int_time)

# =============================================================================
#       MAIN FUNCTION, EVERYONE ELSE SUCKS
#       returns a json file with all relevant information
# =============================================================================

def get_json_plot(center, size, res, obs_set):
    # auxiliary variables
    ra_origin = float(center.ra.degree) - float((size/2)) + arcsec_to_angle(res/2)
    dec_origin = float(center.dec.degree) + float((size/2)) - arcsec_to_angle(res/2)

    # get number of pixels
    angle_size = Angle(size, unit=u.degree)
    angle_res = Angle(res, unit=u.arcsec)
    max_len = int(angle_size/angle_res)

    # create 2D plot and observation array
    pix_array = [[None for x in range(max_len)] for y in range(max_len)]
    obs_array = []
    inc = angle_res.degree

    # iterate over the QuerySet object
    # fill pixels
    for obs in obs_set: # this for statement will be changed to use actual model objects
        print("Processing observation " + str(row["Project code"]) + "(" + str(round(float(count/datasize), 2)*100) + "%)")
        ra = obs.ra
        dec = obs.dec
        fov = obs.field_of_view
        res = obs.spatial_resolution
        sensitivity = obs.line_sensitivity
        source = obs.source_name
        int_time = obs.integration_time
        fillPixels(ra, dec, fov, res, sensitivity, int_time, source)
        obs_array.append(obs)
        count += 1

    # the root json structure
    json_builder = []
    # each of the smaller json lists
    obs_list = []
    pix_list = []

    for x in range(obs_array):
        # will convert the observation objects to the respective json representation
        obs_list.append(obsToDictEntry(obs_array[x]))
    
    # convert full 2d array to json
    for x in range(max_len):
        for y in range(max_len):
            px = pix_array[x][y]
            if(px is not None):
                appendPixel(x,y, px.px_ra, px.px_dec, px.count_obs, px.avg_res, px.avg_sens, px.avg_int_time, px.observations)

    json_builder = {"observations": obs_list, "pixels": pix_list}

    return(json.dump(json_builder, fp, indent=4))
