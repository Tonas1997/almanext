import json
import math
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from field_plot.class_pixel import Pixel
#from common.class_observation import ObservationClass
#from common.class_spectral_window import SpectralWindowClass
from django.core.serializers.json import DjangoJSONEncoder
from field_plot.utils import *

# global vars
pixel_array = None
inc = 0
ra_origin = 0
dec_origin = 0
curr_freq = 0

properties_list = {
    "angular_size": 0,
    "resolution": 0,
    "pixel_len": 0,
    "min_frequency": 0,
    "max_frequency": 0,
    "min_cs": 0,
    "max_cs": 0,
    "total_area": 0,
    "overlap_area": 0,
    "overlap_area_pct": 0,
    "min_count_pointings": 0,
    "max_count_pointings": 0,
    "min_avg_res": 0,
    "max_avg_res": 0,
    "min_avg_sens": 0,
    "max_avg_sens": 0,
    "min_avg_int_time": 0,
    "max_avg_int_time": 0,
    "min_snr": 0,
    "max_snr": 0
}
pixel_list = []
observations_list = []

min_freq = 9999
max_freq = -9999

cs_list = []
cs_list_size = 0
min_cs = 9999
max_cs = -9999

# -----------------------------------------------------------------------------------------
# simple converter, might be discontinued
def arcsec_to_angle(arcsec):
    return arcsec / 3600

def gridToCoords(i, j):
    return((ra_origin + i*inc + inc/2, dec_origin - j*inc + inc/2))

# -----------------------------------------------------------------------------------------
# converts an observation's frequency list to a JSON-serializable format
def get_frequency_from_obs(obs):
    global properties_list
    min_freq = properties_list["min_frequency"]
    max_freq = properties_list["max_frequency"]
    min_cs = properties_list["min_cs"]
    max_cs = properties_list["max_cs"]

    spec_windows = obs.spec_windows.all()
    spec_win_list = []
    cs = obs.continuum_sensitivity
    for s in spec_windows:
        # first, replace the continuum sensitivity values for this frequency (if needed)
        start = s.start
        curr_freq = start
        end = s.end
        # run through the spectral window in 10MHz increments
        while(curr_freq <= end):
            if((curr_freq >= min_freq) and (curr_freq <= max_freq)):
                pos = int((curr_freq - min_freq)*100)
                curr = cs_list[pos]
                if(curr["cs"] == None or cs > curr["cs"]):
                    cs_list[pos]["cs"] = cs
                    if(cs > max_cs): properties_list["max_cs"] = cs
                    if(cs < min_cs): properties_list["min_cs"] = cs 
            curr_freq += 0.01 
        spec_win_list.append({"start": s.start,
                            "end": s.end,
                            "resolution": s.resolution,
                            "sensitivity_10kms": s.sensitivity_10kms,
                            "sensitivity_native": s.sensitivity_native,
                            "pol_product": s.pol_product
        })
    return spec_win_list

# -----------------------------------------------------------------------------------------
# extracts the arrays list from an observation
def get_arrays_from_obs(obs):
    arrays = obs.arrays.all()
    array_list = []
    for a in arrays:
        array_list.append({"array": a.designation})
    return array_list

# -----------------------------------------------------------------------------------------
# extracts the bands list from an observation
def get_bands_from_obs(obs):
    bands = obs.bands.all()
    band_list = []
    for b in bands:
        band_list.append({"band": b.designation})
    return band_list

# -----------------------------------------------------------------------------------------
# extracts the trace list from an observation
def get_traces_from_obs(obs):
    traces = obs.traces.all()
    trace_list = []
    for t in traces:
        trace_list.append({"ra": t.ra,
                            "dec": t.dec,
                            "fov": t.fov})
    return trace_list
    

# -----------------------------------------------------------------------------------------
# gets the mean frequency of a given observation
def get_mean_freq(freq_list):
    mean_freq = 0
    for f in freq_list:
        start = f["start"]
        end = f["end"]
        mean_freq += float(start) + (float(end)-float(start)) / 2
    mean_freq = mean_freq / len(freq_list)
    return mean_freq

# -----------------------------------------------------------------------------------------
# appends a pixel to the final JSON object
def append_pixel(x, y, px):
    global pixel_list, properties_list
    # we have to set min and max values for the snr here
    snr_total = math.sqrt(px.snr)
    if(snr_total > properties_list["max_snr"]): properties_list["max_snr"] = snr_total
    if(snr_total < properties_list["min_snr"]): properties_list["min_snr"] = snr_total
    # append the pixel to the pixel list
    pixel_list.append({"x" : x,
                    "y" : y,
                    "ra" : px.px_ra,
                    "dec" : px.px_dec,
                    "count_pointings" : px.count_pointings,
                    "avg_res" : px.avg_res,
                    "avg_sens" : px.avg_sens,
                    "avg_int_time" : px.avg_int_time,
                    "snr" : math.sqrt(px.snr),
                    "observations" : px.observations})

# -----------------------------------------------------------------------------------------
# appends an observation to the final JSON object
def observation_to_json(obs, index):
    return({"index": index,
            "project_code": obs.project_code,
            "source_name": obs.source_name,
            "ra": obs.ra,
            "dec": obs.dec,
            "mosaic": obs.mosaic,
            "traces": get_traces_from_obs(obs),
            "gal_longitude": obs.gal_longitude,
            "gal_latitude": obs.gal_latitude,
            "frequency": get_frequency_from_obs(obs),
            "bands": get_bands_from_obs(obs),
            "spatial_resolution": obs.spatial_resolution,
            "frequency_resolution": obs.frequency_resolution,
            "arrays": get_arrays_from_obs(obs),
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
# ARGS: the json representation of the observation, the mean frequency, the antenna array and the observation counter
def fill_pixels(obs_json, mean_freq, array, counter):
    global pixel_array, properties_list

    res = obs_json["spatial_resolution"]
    sens = obs_json["line_sensitivity"]
    int_time = obs_json["integration_time"]

    # iterate over the osbervation's traces
    for t in obs_json["traces"]:
        ra = t["ra"]
        dec = t["dec"]
        fov = t["fov"]

        # ignore this trace if it's faulty (e.g. the observation is a mosaic and
        # this trace has the same fov as the observation)
        if(fov > 220):
            continue

        # builds an Angle object for convenience
        fov_degree = Angle(fov, unit=u.arcsec)
        fov_degree = fov_degree/2
        # define some support variables and the subgrid
        radius = int(fov_degree.degree / inc)

        # sets the center plot grid coordinates 
        center = SkyCoord(ra, dec, unit=(u.deg, u.deg), frame='icrs')
        centerX = int(abs(ra - ra_origin) / inc)
        centerY = int(abs(dec - dec_origin) / inc)

        # sets the top-left and bottom-right plot grid coordinates
        topLeft = [int(max(0, centerX - radius - 1)), int(max(0, centerY - radius - 1))]
        bottomRight = [int(min(pixel_len - 1, centerX + radius + 1)), int(min(pixel_len - 1, centerY + radius + 1))]

        # fills the pixels of the subgrid
        for y in range(topLeft[1], bottomRight[1]+1):
            for x in range(topLeft[0], bottomRight[0]+1):
                # get the current cell coordinates
                coords = gridToCoords(x, y)
                currCoord = SkyCoord(coords[0]*u.degree, coords[1]*u.degree, frame='icrs')
                # see if the current cell falls within the observation fov
                sep = center.separation(currCoord)
                if(sep < fov_degree):
                    pixel = pixel_array[y][x]
                    # if there's no pixel in that region, create one
                    if(pixel is None):
                        new_pixel = Pixel(x, y, currCoord.ra.degree, currCoord.dec.degree)
                        pixel_array[y][x] = new_pixel
                    # else, increment the plot's overlapping area counter
                    elif(len(pixel.observations) == 1):
                        properties_list["overlap_area"] += properties_list["resolution"] ** 2
                    # change the average values
                    pixel_array[y][x].change_avgs(res, sens, int_time)
                    # add the signal-to-noise level
                    distance_ratio = sep/fov_degree
                    if(array == "12"):
                        snr = gaussian12m(distance_ratio*100, mean_freq)
                    else:
                        snr = gaussian7m(distance_ratio*100, mean_freq)
                    pixel_array[y][x].add_snr(snr**2)
                    # add the observation to the pixel, if it's not already covered by this observation
                    if(not pixel_array[y][x].has_observation(counter)):
                        pixel_array[y][x].add_observation(counter)

                    # update plot area
                    properties_list["total_area"] += properties_list["resolution"] ** 2
                    curr_px = pixel_array[y][x]
                    # update max/min values for each of the pixel's fields
                    if(curr_px.count_pointings < properties_list["min_count_pointings"]): properties_list["min_count_pointings"] = curr_px.count_pointings
                    if(curr_px.count_pointings > properties_list["max_count_pointings"]): properties_list["max_count_pointings"] = curr_px.count_pointings
                    if(curr_px.avg_res < properties_list["min_avg_res"]): properties_list["min_avg_res"] = curr_px.avg_res
                    if(curr_px.avg_res > properties_list["max_avg_res"]): properties_list["max_avg_res"] = curr_px.avg_res
                    if(curr_px.avg_sens < properties_list["min_avg_sens"]): properties_list["min_avg_sens"] = curr_px.avg_sens
                    if(curr_px.avg_sens > properties_list["max_avg_sens"]): properties_list["max_avg_sens"] = curr_px.avg_sens
                    if(curr_px.avg_int_time < properties_list["min_avg_int_time"]): properties_list["min_avg_int_time"] = curr_px.avg_int_time
                    if(curr_px.avg_int_time > properties_list["max_avg_int_time"]): properties_list["max_avg_int_time"] = curr_px.avg_int_time

# -----------------------------------------------------------------------------------------
# resets the properties list to its initial values
def reset_properties_list(plot_size, plot_res, min_f, max_f):
    global properties_list
    properties_list["n_observations"] = 0
    properties_list["angular_size"] = plot_size
    properties_list["resolution"] = plot_res
    properties_list["pixel_len"] = 0
    properties_list["min_frequency"] = min_f
    properties_list["max_frequency"] = max_f
    properties_list["min_cs"] = 9999
    properties_list["max_cs"] = -9999
    properties_list["total_area"] = 0 
    properties_list["overlap_area"] = 0
    properties_list["overlap_area_pct"] = 0
    properties_list["min_count_pointings"] = 9999
    properties_list["max_count_pointings"] = -9999
    properties_list["min_avg_res"] = 9999
    properties_list["max_avg_res"] = -9999
    properties_list["min_avg_sens"] = 9999
    properties_list["max_avg_sens"] = -9999
    properties_list["min_avg_int_time"] = 9999
    properties_list["max_avg_int_time"] = -9999
    properties_list["min_snr"] : 9999
    properties_list["max_snr"] : -9999

# -----------------------------------------------------------------------------------------
# populates the continuum sensitivity list
def fill_cs_list(min_freq, max_freq):
    global cs_list, cs_list_size

    cs_list_size = int((max_freq - min_freq) * 100)
    ls = []
    curr_freq = min_freq
    for i in range(0, cs_list_size):
        # append a new entry
        ls.append({
            "freq": curr_freq,
            "cs": None
        })
        curr_freq += 0.01
    cs_list = ls

# =============================================================================
#       MAIN FUNCTION, EVERYONE ELSE SUCKS
#       returns a json file with all relevant information
# =============================================================================

def get_json_plot(center, plot_size, plot_res, obs_set, min_f, max_f):

    global properties_list, observations_list, pixel_list, cs_list, min_freq, max_freq, min_cs, max_cs

    pixel_list = []
    observations_list = []

    reset_properties_list(plot_size, plot_res, min_f, max_f)

    min_freq = min_f
    max_freq = max_f

    min_cs = 9999
    max_cs = -9999

    fill_cs_list(min_freq, max_freq)
    

    # auxiliary variables
    global ra_origin, dec_origin, angle_size, angle_res, pixel_len, inc, pixel_array
    ra_origin = float(center.ra.degree) - float((plot_size/2)) + arcsec_to_angle(plot_res/2)
    print(ra_origin)
    dec_origin = float(center.dec.degree) + float((plot_size/2)) - arcsec_to_angle(plot_res/2)

    # get number of pixels
    angle_size = Angle(plot_size, unit=u.degree)
    angle_res = Angle(plot_res, unit=u.arcsec)
    pixel_len = int(angle_size/angle_res)

    # create 2D plot and observation array
    pixel_array = [[None for x in range(pixel_len)] for y in range(pixel_len)]
    print("pix_len: " + str(pixel_len))
    print(ra_origin + (pixel_len - 1) * arcsec_to_angle(plot_res))
    obs_array = []
    inc = angle_res.degree

    # iterate over the QuerySet object
    # fill pixels
    counter = 0
    for obs in obs_set: # this for statement will be changed to use actual model objects
        #print("Processing observation " + str(index) + "(" + str(round(float(index/obs_set.count()), 2)*100) + "%)")
        obs_json = observation_to_json(obs, counter)
        mean_freq = get_mean_freq(obs_json["frequency"])
        print(mean_freq)
        array = obs_json["arrays"][0]
        fill_pixels(obs_json, mean_freq, array, counter)
        observations_list.append(obs_json)
        counter += 1
        properties_list["n_observations"] = counter

    # the root json structure
    json_builder = []
    # updates the properties list
    properties_list["pixel_len"] = pixel_len
    if(properties_list["total_area"] > 0):
        properties_list["overlap_area_pct"] = properties_list["overlap_area"] / properties_list["total_area"]
    else:
        properties_list["overlap_area_pct"] = "0"
    print(properties_list)
    
    # convert full 2d array to json
    for x in range(pixel_len):
        for y in range(pixel_len):
            px = pixel_array[x][y]
            if(px is not None):
                append_pixel(x, y, px)

    print("Number of observations: " + str(len(observations_list)))
    json_builder = {"properties": properties_list, "observations": observations_list, "continuum_sensitivity": cs_list, "pixels": pixel_list}
    print(len(json_builder))

    with open('query_result.json', 'w') as outfile:
        json.dump(json_builder, outfile, indent=4, cls=DjangoJSONEncoder)

    return(json.dumps(json_builder, cls=DjangoJSONEncoder))
