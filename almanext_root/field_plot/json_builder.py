import json
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from field_plot.class_pixel import Pixel
from common.class_observation import ObservationClass
from common.class_spectral_window import SpectralWindowClass
from django.core.serializers.json import DjangoJSONEncoder

# global vars
pix_array = None
inc = 0
ra_origin = 0
dec_origin = 0
curr_freq = 0
pix_list = []
obs_list = []

# dataset properties
min_freq = 9999
max_freq = -9999

# -----------------------------------------------------------------------------------------
# simple converter, might be discontinued
def arcsec_to_angle(arcsec):
    return arcsec / 3600

def gridToCoords(i, j):
    return((ra_origin + i*inc + inc/2, dec_origin - j*inc + inc/2))

# -----------------------------------------------------------------------------------------
# converts an observation's frequency list to a JSON-serializable format
def getFrequencyFromObs(obs):
    spec_windows = obs.spec_windows.all()
    spec_win_list = []
    for s in spec_windows:
        spec_win_list.append({"start": s.start,
                            "end": s.end,
                            "resolution": s.resolution,
                            "sensitivity_10kms": s.sensitivity_10kms,
                            "sensitivity_native": s.sensitivity_native,
                            "pol_product": s.pol_product
        })
    return spec_win_list

def getBandsFromObs(obs):
    bands = obs.bands.all()
    band_list = []
    for b in bands:
        band_list.append({"band": b.designation})
    return band_list
    

# -----------------------------------------------------------------------------------------
# appends a pixel to the final JSON object
def appendPixel(x, y, ra, dec, count_obs, avg_res, avg_sens, avg_int_time, observations):
    global pix_list
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
# appends an observation to the final JSON object
def appendObservation(obs, index):
    global obs_list, min_freq, max_freq
    for w in obs.spec_windows.all():
        if w.start < min_freq: min_freq = w.start
        if w.end > max_freq: max_freq = w.end

    obs_list.append({"index": index,
                    "project_code": obs.project_code,
                    "source_name": obs.source_name,
                    "ra": obs.ra,
                    "dec": obs.dec,
                    "gal_longitude": obs.gal_longitude,
                    "gal_latitude": obs.gal_latitude,
                    "frequency": getFrequencyFromObs(obs),
                    "bands": getBandsFromObs(obs),
                    "spatial_resolution": obs.spatial_resolution,
                    "frequency_resolution": obs.frequency_resolution,
                    #"arrays": obs.arrays,
                    "integration_time": obs.integration_time,
                    "release_date": obs.release_date,
                    "velocity_resolution": obs.velocity_resolution,
                    "pol_product": obs.pol_product,
                    "observation_date": obs.observation_date,
                    "pi_name": obs.pi_name,
                    "sb_name": obs.sb_name,
                    "proposal_authors": obs.proposal_authors,
                    "line_sensitivity": obs.line_sensitivity,
                    "continuum_sensitivity": obs.continuum_sensitivity,
                    "pwv": obs.pwv,
                    "group_ous_id": obs.group_ous_id,
                    "member_ous_id": obs.member_ous_id,
                    "asdm_uid": obs.asdm_uid,
                    "project_title": obs.project_title,
                    "project_type": obs.project_type,
                    "scan_intent": obs.scan_intent,
                    "field_of_view": obs.field_of_view,
                    "largest_angular_scale": obs.largest_angular_scale,
                    "qa2_status": obs.qa2_status,
                    "count" : obs.count,
                    "science_keywords": obs.science_keywords,
                    "scientific_cat": obs.scientific_cat,
                    "asa_project_code": obs.asa_project_code})

# -----------------------------------------------------------------------------------------
# fills the pixels around given ra/dec coordinates and a fov measured in arcsecs

def fillPixels(ra, dec, fov, res, sens, int_time, obs):
    global pix_array
    # builds an Angle object for convenience
    fov_degree = Angle(fov, unit=u.arcsec)
    fov_degree = fov_degree/2
    # define some support variables and the subgrid
    radius = int(fov_degree.degree / inc)

    center = SkyCoord(ra, dec, unit=(u.deg, u.deg), frame='icrs')
    centerX = int(abs(ra - ra_origin) / inc)
    centerY = int(abs(dec - dec_origin) / inc)

    topLeft = [int(max(0, centerX - radius - 1)), int(max(0, centerY - radius - 1))]
    bottomRight = [int(min(pixel_len - 1, centerX + radius + 1)), int(min(pixel_len - 1, centerY + radius + 1))]
    # print(topLeft)
    # print(bottomRight)
    # fills the pixels of the subgrid
    for y in range(topLeft[1], bottomRight[1]+1):
        for x in range(topLeft[0], bottomRight[0]+1):
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
                pix_array[y][x].add_observation(obs)

# =============================================================================
#       MAIN FUNCTION, EVERYONE ELSE SUCKS
#       returns a json file with all relevant information
# =============================================================================

def get_json_plot(center, plot_size, plot_res, obs_set):

    global pix_list, obs_list, min_freq, max_freq

    pix_list = []
    obs_list = []
    min_freq = 9999
    max_freq = -9999

    # auxiliary variables
    global ra_origin, dec_origin, angle_size, angle_res, pixel_len, inc, pix_array
    ra_origin = float(center.ra.degree) - float((plot_size/2)) + arcsec_to_angle(plot_res/2)
    print(ra_origin)
    dec_origin = float(center.dec.degree) + float((plot_size/2)) - arcsec_to_angle(plot_res/2)

    # get number of pixels
    angle_size = Angle(plot_size, unit=u.degree)
    angle_res = Angle(plot_res, unit=u.arcsec)
    pixel_len = int(angle_size/angle_res)

    # create 2D plot and observation array
    pix_array = [[None for x in range(pixel_len)] for y in range(pixel_len)]
    obs_array = []
    inc = angle_res.degree

    # iterate over the QuerySet object
    # fill pixels
    counter = 0
    for obs in obs_set: # this for statement will be changed to use actual model objects
        #print("Processing observation " + str(index) + "(" + str(round(float(index/obs_set.count()), 2)*100) + "%)")
        ra = obs.ra
        dec = obs.dec
        fov = obs.field_of_view
        res = obs.spatial_resolution
        sensitivity = obs.line_sensitivity
        source = obs.source_name
        int_time = obs.integration_time
        fillPixels(ra, dec, fov, res, sensitivity, int_time, counter)
        appendObservation(obs, counter)
        counter += 1

    # the root json structure
    json_builder = []
    # properties list
    properties_list = {
        "angular_size": plot_size,
        "resolution": plot_res,
        "pixel_len": pixel_len,
        "min_frequency": min_freq,
        "max_frequency": max_freq
    }

    print(properties_list)
    
    # convert full 2d array to json
    for x in range(pixel_len):
        for y in range(pixel_len):
            px = pix_array[x][y]
            if(px is not None):
                appendPixel(x,y, px.px_ra, px.px_dec, px.count_obs, px.avg_res, px.avg_sens, px.avg_int_time, px.observations)

    print("Number of observations: " + str(len(obs_list)))
    json_builder = {"properties": properties_list, "observations": obs_list, "pixels": pix_list}
    print(len(json_builder))

    with open('query_result.json', 'w') as outfile:
        json.dump(json_builder, outfile, indent=4, cls=DjangoJSONEncoder)

    return(json.dumps(json_builder, cls=DjangoJSONEncoder))
