import json
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

# -----------------------------------------------------------------------------------------
# simple converter, might be discontinued
def arcsec_to_angle(arcsec):
    return arcsec / 3600

def gridToCoords(i, j):
    return((ra_origin + i*inc + inc/2, dec_origin - j*inc + inc/2))

# -----------------------------------------------------------------------------------------
# appends a pixel to the final JSON object
def appendPixel(x, y, ra, dec, count_obs, avg_res, avg_sens, avg_int_time):
    json_builder.append({"x" : x,
                         "y" : y,
                         "RA" : ra,
                         "Dec" : dec,
                         "count_obs" : count_obs,
                         "avg_res" : avg_res,
                         "avg_sens" : avg_sens,
                         "avg_int_time" : avg_int_time})

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
                pixel = obs_array[y][x]
                if(pixel is None):
                    new_pixel = Pixel(x, y, currCoord.ra.degree, currCoord.dec.degree)
                    obs_array[y][x] = new_pixel
                obs_array[y][x].change_avgs(res, sens, int_time)

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
    global max_len = int((angle_size/angle_res))

    # create 2D plot
    global obs_array = [[None for x in range(max_len)] for y in range(max_len)]
    global inc = angle_res.degree

    # iterate over the QuerySet object
    # fill pixels
    for index, row in cosmos_field.iterrows(): # this for statement will be changed to use actual model objects
        print("Processing observation " + str(row["Project code"]) + "(" + str(round(float(count/datasize), 2)*100) + "%)")
        ra = row["RA"]
        dec = row["Dec"]
        fov = row["Field of view"]
        res = row["Spatial resolution"]
        sensitivity = row["Line sensitivity (10 km/s)"]
        source = row["Source name"]
        int_time = row["Integration"]
        fillPixels(ra, dec, fov, res, sensitivity, int_time, source)
        count += 1

    json_builder = []

    # convert full 2d array to json
    for x in range(max_len):
        for y in range(max_len):
            px = obs_array[x][y]
            if(px is not None):
                appendPixel(x,y, px.px_ra, px.px_dec, px.count_obs, px.avg_res, px.avg_sens, px.avg_int_time)

    return(json.dump(json_builder, fp, indent=4))
