import json
import math
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from field_plot.utils import *
from field_plot.class_pixel import Pixel
from celery import task

#from common.class_observation import ObservationClass
#from common.class_spectral_window import SpectralWindowClass
from django.core.serializers.json import DjangoJSONEncoder


# global vars
pixel_array = None
inc = 0
ra_origin = 0
dec_origin = 0
curr_freq = 0
counter = 0

# the reference synthesized beam
ref_psf = 1.0

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
    "min_combined_cs_12m": 0,
    "max_combined_cs_12m": 0,
    "min_combined_cs_7m": 0,
    "max_combined_cs_7m": 0,
    "min_combined_cs_tp": 0,
    "max_combined_cs_tp": 0,
    "min_freq_obs_count": 0,
    "max_freq_obs_count": 0,
    "min_freq_obs_t_area": 0,
    "max_freq_obs_t_area": 0,
}
pixel_area = 0
pixel_list = []
lock_list = []
observations_list = []

min_freq = 9999
max_freq = -9999
min_freq_obs_count = 0
max_freq_obs_count = -9999
min_freq_obs_t_area = 0
max_freq_obs_t_area = -9999

freq_list = []
freq_list_size = 0
min_cs = 9999
max_cs = -9999

# -----------------------------------------------------------------------------------------
# simple converter, might be discontinued
def arcsec_to_angle(arcsec):
    return arcsec / 3600

def gridToCoords(i, j):
    return((ra_origin + i*inc + inc/2, dec_origin - j*inc + inc/2))

# updates the minimum and maximum values for a given property
def update_min_max(key, value):
    global properties_list
    min_property_name = str("min_" + key)
    max_property_name = str("max_" + key)
    if(value < properties_list[min_property_name]): 
        properties_list[min_property_name] = value
    if(value > properties_list[max_property_name]): 
        properties_list[max_property_name] = value 


# -----------------------------------------------------------------------------------------
# converts an observation's frequency list to a JSON-serializable format
def get_frequency_from_obs(obs, index):
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
                pos = int((curr_freq - min_freq)*100)-1
                curr = freq_list[pos]
                # only add this observation to the list if it's not there yet
                if(index not in freq_list[pos]["observations"]):
                    freq_list[pos]["observations"].append(index)
                if(curr["cs"] == None or cs > curr["cs"]):
                    freq_list[pos]["cs"] = cs
                    update_min_max("freq_obs_count", len(freq_list[pos]["observations"]))
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
    combined_cs_12m = None 
    combined_cs_7m = None
    combined_cs_tp = None

    if(px.cs_sum_12m != 0):
        #print("12m")
        combined_cs_12m = 1/math.sqrt(px.cs_sum_12m)
        update_min_max("combined_cs_12m", 1/(combined_cs_12m/px.cs_best))
    if(px.cs_sum_7m != 0):
        #print("7m")
        combined_cs_7m = 1/math.sqrt(px.cs_sum_7m)
        update_min_max("combined_cs_7m", 1/(combined_cs_7m/px.cs_best))
    if(px.cs_sum_tp != 0):
        #print("TP")
        combined_cs_tp = 1/math.sqrt(px.cs_sum_tp)
        update_min_max("combined_cs_tp", 1/(combined_cs_tp/px.cs_best))

    # append the pixel to the pixel list
    pixel_list.append({"x" : x,
                    "y" : y,
                    "ra" : px.px_ra,
                    "dec" : px.px_dec,
                    "count_pointings" : px.count_pointings,
                    "avg_res" : px.avg_res,
                    "avg_sens" : px.avg_sens,
                    "avg_int_time" : px.avg_int_time,
                    "cs_comb_12m" : combined_cs_12m,
                    "cs_comb_7m" : combined_cs_7m,
                    "cs_comb_tp" : combined_cs_tp,
                    "cs_best": px.cs_best,
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
            "total_area": 0,
            "overlap_area": 0,
            "gal_longitude": obs.gal_longitude,
            "gal_latitude": obs.gal_latitude,
            "frequency": get_frequency_from_obs(obs, index),
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
# updates the overlap area for all observations on a given pixel
def update_obs_overlapping_areas(y, x, counter):
    print("========================================")
    global observations_list
    pixel_observations = pixel_array[y][x].get_observations()
    for o in pixel_observations:
        print("o: " + str(o) + ", l: " + str(pixel_observations) + ", c: " + str(counter))
        # this will prevent duplicate increments
        if(o != counter and len(pixel_observations) < 2):
            observations_list[o]["overlap_area"] += pixel_area

# -----------------------------------------------------------------------------------------
# updates the total area for all frequency buckets covered by a given observation
def increase_freq_bucket_total_area(obs_json):
    global max_freq_obs_t_area
    obs_windows = obs_json["frequency"]
    obs_area = obs_json["total_area"]
    for o in obs_windows:
        start = o["start"]
        curr_freq = start
        end = o["end"]
        # run through the spectral window in 10MHz increments
        while(curr_freq <= end):
            if((curr_freq >= min_freq) and (curr_freq <= max_freq)):
                pos = int((curr_freq - min_freq)*100)-1
                freq_list[pos]["total_area"] += obs_area
                update_min_max("freq_obs_t_area", freq_list[pos]["total_area"])
            curr_freq += 0.01

# -----------------------------------------------------------------------------------------
# fills the pixels around given ra/dec coordinates and a fov measured in arcsecs
# ARGS: the json representation of the observation, the mean frequency, the antenna array and the observation counter
def fill_pixels(obs_json, mean_freq, array, counter):
    global pixel_array, properties_list

    res = obs_json["spatial_resolution"]
    sens = obs_json["line_sensitivity"]
    int_time = obs_json["integration_time"]
    obs_fov = obs_json["field_of_view"]
    is_mosaic = obs_json["mosaic"]

    # normalize sensitivity to the common synthesized beam
    scaled_cont_sens = obs_json["continuum_sensitivity"] * (res/ref_psf)

    # iterate over the observation's traces
    for t in obs_json["traces"]:
        ra = t["ra"]
        dec = t["dec"]
        fov = t["fov"]

        # ignore this trace if it's faulty (e.g. the observation is a mosaic and
        # this trace has the same fov as the observation)
        # this solution isn't perfect since the traces file uses higher-precision values
        # for the fov, so there's always a mismatch. For now we'll ignore those which are closer than 5 arcsec
        # to the observation's listed fov.
        diff = abs(fov - obs_fov)
        if(diff < 5 and is_mosaic):
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
                    # increase the observation's area
                    obs_json["total_area"] += pixel_area
                    # if there's no pixel in that region, create one
                    if(pixel is None):
                        new_pixel = Pixel(x, y, currCoord.ra.degree, currCoord.dec.degree)
                        pixel_array[y][x] = new_pixel
                        # update plot area   
                        properties_list["total_area"] += pixel_area
                    # else, increment the plot's overlapping area counter...
                    elif(pixel.count_pointings >= 1):
                        properties_list["overlap_area"] += pixel_area
                        # ...and also for any other observations covering this pixel
                        obs_json["overlap_area"] += pixel_area
                        update_obs_overlapping_areas(y, x, counter)  
                    # change the average values
                    pixel_array[y][x].change_avgs(res, sens, int_time)
                    # add the signal-to-noise level
                    print(array)
                    if(array == "12"):
                        fraction_pb = gaussian12m(sep.arcsec, mean_freq)
                        pixel_array[y][x].add_cs_12m((1.0/(scaled_cont_sens/fraction_pb))**2)
                    elif(array == "7"):
                        fraction_pb = gaussian7m(sep.arcsec, mean_freq)
                        pixel_array[y][x].add_cs_7m((1.0/(scaled_cont_sens/fraction_pb))**2)
                    else: # TODO, total power gaussian? let's assume 7m for a worst-case scenario~
                        fraction_pb = gaussian7m(sep.arcsec, mean_freq)
                        pixel_array[y][x].add_cs_tp((1.0/(scaled_cont_sens/fraction_pb))**2)

                    pixel_array[y][x].update_best_cs(scaled_cont_sens/fraction_pb)
                    # TODO
                    # pixel_array[y][x].add_snr(snr**2)
                    # add the observation to the pixel, if it's not already covered by this observation
                    if(not pixel_array[y][x].has_observation(counter)):
                        pixel_array[y][x].add_observation(counter)

                    curr_px = pixel_array[y][x]
                    # update max/min values for each of the pixel's fields
                    update_min_max("count_pointings", curr_px.count_pointings)
                    update_min_max("avg_res", curr_px.avg_res)
                    update_min_max("avg_sens", curr_px.avg_sens)
                    update_min_max("avg_int_time", curr_px.avg_int_time)
                    # update the total area for all frequency buckets covered by this observation
    increase_freq_bucket_total_area(obs_json)
    return obs_json

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
    properties_list["min_combined_cs_12m"] = 9999
    properties_list["max_combined_cs_12m"] = -9999
    properties_list["min_combined_cs_7m"] = 9999
    properties_list["max_combined_cs_7m"] = -9999
    properties_list["min_combined_cs_tp"] = 9999
    properties_list["max_combined_cs_tp"] = -9999
    properties_list["min_freq_obs_count"] = 0
    properties_list["max_freq_obs_count"] = -9999
    properties_list["min_freq_obs_t_area"] = 0
    properties_list["max_freq_obs_t_area"] = -9999

# -----------------------------------------------------------------------------------------
# populates the continuum sensitivity list with default values which will be replaced later on
def fill_frequency_list(min_freq, max_freq):
    global freq_list, freq_list_size

    freq_list_size = int((max_freq - min_freq) * 100)
    ls = []
    curr_freq = min_freq
    for i in range(0, freq_list_size):
        # append a new entry
        ls.append({
            "freq": curr_freq,
            "cs": None,
            "observations": [],
            "total_area": 0

        })
        curr_freq += 0.01
    freq_list = ls

# =============================================================================
#       MAIN FUNCTION, EVERYONE ELSE SUCKS
#       returns a json file with all relevant information
# =============================================================================

def process_observation(obs):
    global observations_list, properties_list, counter
    print(inc) 
    obs_json = observation_to_json(obs, counter)
    mean_freq = get_mean_freq(obs_json["frequency"])
    print(mean_freq)
    array = obs_json["arrays"][0]
    fill_pixels(obs_json, mean_freq, array, counter)
    observations_list.append(obs_json)
    properties_list["n_observations"] += 1

@task
def get_json_plot(center, plot_size, plot_res, obs_set, min_f, max_f):

    global properties_list, pixel_area, observations_list, pixel_list, lock_list, freq_list, min_freq, max_freq, min_cs, max_cs, counter

    pixel_list = []
    observations_list = []

    reset_properties_list(plot_size, plot_res, min_f, max_f)

    min_freq = min_f
    max_freq = max_f

    min_cs = 9999
    max_cs = -9999

    fill_frequency_list(min_freq, max_freq)
    pixel_area = properties_list["resolution"] ** 2
    

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
    # lock_list = [[multiprocessing.Lock() for x in range(pixel_len)] for y in range(pixel_len)]

    print("pix_len: " + str(pixel_len))
    print(ra_origin + (pixel_len - 1) * arcsec_to_angle(plot_res))
    obs_array = []
    inc = angle_res.degree

    # iterate over the QuerySet object
    # fill pixels
    counter = 0

    #pool = multiprocessing.Pool()
    #pool.map(process_observation, obs_set)
    #pool.close()
    #pool.join()

    for obs in obs_set: # this for statement will be changed to use actual model objects
        #print("Processing observation " + str(index) + "(" + str(round(float(index/obs_set.count()), 2)*100) + "%)")
        obs_json = observation_to_json(obs, counter)
        mean_freq = get_mean_freq(obs_json["frequency"])
        print(mean_freq)
        array = obs_json["arrays"][0].get("array")
        # since obs_json is a local object and needs to be edited by fill_pixels to change the observation's area, we need
        # to pass it as an argument and get the modified result
        obs_json = fill_pixels(obs_json, mean_freq, array, counter)
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
    json_builder = {"properties": properties_list, "observations": observations_list, "continuum_sensitivity": freq_list, "pixels": pixel_list}
    print(len(json_builder))

    with open('query_result.json', 'w') as outfile:
        json.dump(json_builder, outfile, indent=4, cls=DjangoJSONEncoder)

    return(json.dumps(json_builder, cls=DjangoJSONEncoder))
