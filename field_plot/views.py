import numpy as np
from field_plot import json_builder
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from django.shortcuts import render
from django.http import JsonResponse
from common.models import Observation, SpectralWindow, Trace

ra_origin = 0
dec_origin = 0
inc = 0
minF = 0
maxF = 0

def index(request):
    #return HttpResponse("<h1>Hello world</h1>")
    return render(request, 'base.html')

# Create your views here.
def get_plot(request, var_center, var_size, var_res, min_freq, max_freq):

    center = ["10h00m24s","+2:00"]
    size = 2
    res = 10

    min_freq = 85
    max_freq = 115

    # defines the center of the observation in the form of a SkyCoord object
    center = SkyCoord(var_center[0], var_center[1], unit=(u.hourangle, u.deg))
    coords = [center.ra.degree, center.dec.degree]

    min_ra = 148
    max_ra = 152
    min_dec = 0
    max_dec = 4

    obs_set = []

    # =============================================================================

    # get observations (NEEDS OVERHAUL, CURRENTLY IT ONLY FILTERS BY REGION, NOT FREQUENCY SUPPORT)
    query_result_obs = Observation.objects.filter(ra > min_ra, ra < max_ra,dec > min_dec, dec < max_dec).prefetch_related('spec_windows').prefetch_related('traces')

    # wraps model objects into simpler custom classes
    obs_set = []

    # iterates through each of the database query result objects
    for curr_obs in query_result_obs:
        curr_spec_windows =  curr_obs.spec_windows.all()
        curr_traces = curr_obs.traces.all()

        # create new (Python) observation, trace and spec_win objects
        obs = ObservationClass(curr_obs.ra, curr_obs.dec)
        trace_list = []
        spec_win_list = []

        # parse traces
        for trace in curr_traces:
            trace_list.append(trace.to_class())

        # parse spectral windows
        for win in curr_spec_windows:
            spec_win_list.append(win.to_class())

        obs.trace_list = trace_list
        obs.spectral_window_list = spec_win_list

        obs_set.append(obs)

# =============================================================================

    JSONplot = get_json_plot(center, size, res, obs_set)

# =============================================================================
#     RETURN A JSON OBJECT
# =============================================================================

    return JsonResponse(JSONplot)
