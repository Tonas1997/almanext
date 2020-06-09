import numpy as np
from field_plot.json_builder import *
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from django.shortcuts import render
from django.http import JsonResponse
from common.models import Observation, SpectralWindow, Trace, Band

ra_origin = 0
dec_origin = 0
inc = 0
minF = 0
maxF = 0

# determines if an observation has coverage on the listed (and redshifted) bands
def coversBands(z_bands, o):
    for b in z_bands:
        for w in o.spec_windows.iterator():
            if((w.start < b['start'] and w.end > b['start']) or
                (w.start < b['end'] and w.end > b['end']) or
                (w.start < b['start'] and w.end > b['end']) or
                (w.start > b['start'] and w.end < b['end'])):
                return True
    return False

def index(request):
    #return HttpResponse("<h1>Hello world</h1>")
    return render(request, 'field_plot/main.html')

# returns the json file generated with the given request
def get_plot(request):

    ra = float(request.GET.get('ra', None))
    dec = float(request.GET.get('dec', None))
    size = float(request.GET.get('size', None))
    bands = request.GET.getlist('bands[]', None)
    z = float(request.GET.get('redshift', None))
    res = float(request.GET.get('res', None))

    print("bands:" + str(bands))

    # defines the center of the observation in the form of a SkyCoord object
    center = SkyCoord(ra, dec, unit=(u.deg, u.deg))

    min_ra = ra - (size / 2)
    max_ra = ra + (size / 2)
    min_dec = dec - (size / 2)
    max_dec = dec + (size / 2)

    # =============================================================================
    print(str(min_ra) + " , " + str(max_ra) + " , " + str(min_dec) + " , " + str(max_dec))
    
    obs_result = Observation.objects.filter(ra__gte = min_ra, ra__lte = max_ra, dec__gte = min_dec, dec__lte = max_dec)#, field_of_view__lte = 30)#.prefetch_related('spec_windows').prefetch_related('traces')
    # if the redshift is zero, no need to look into frequency support
    print("size 1:" + str(obs_result.count()))
    if(z == 0):
        obs_result = obs_result.filter(bands__designation__in = bands)
        bands_qs = Band.objects.filter(designation__in = bands)
        min_freq = bands_qs.first().start
        max_freq = bands_qs.last().end
    # otherwise, apply the given redshift to the selected bands
    else:
        z_bands = []
        min_freq = 9999
        max_freq = -9999 
        for b in Band.objects.filter(designation__in = bands):
            new_z_band = {
                "start": b.start / (1+z), # cosmological redshift
                "end": b.end / (1+z)
            }
            print(new_z_band)
            if(new_z_band["start"] < min_freq): min_freq = new_z_band["start"]
            if(new_z_band["end"] > max_freq): max_freq = new_z_band["end"]
            z_bands.append(new_z_band)
            
        for o in obs_result:
            covers = coversBands(z_bands, o)
            if(not covers):
                obs_result = obs_result.exclude(id=o.id)

    print(obs_result.query)

    print("size 2:" + str(obs_result.count()))
# =============================================================================

    JSONplot = get_json_plot(center, size, res, obs_result, min_freq, max_freq)

# =============================================================================
#     RETURN A JSON OBJECT
# =============================================================================

    return JsonResponse(JSONplot, safe=False)
