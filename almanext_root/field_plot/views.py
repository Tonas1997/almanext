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

# Create your views here.
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

    min_ra = ra - size
    max_ra = ra + size
    min_dec = dec - size
    max_dec = dec + size

    # =============================================================================
    print(str(min_ra) + " , " + str(max_ra) + " , " + str(min_dec) + " , " + str(max_dec))
    
    obs_result = Observation.objects.filter(ra__gte = min_ra, ra__lte = max_ra, dec__gte = min_dec, dec__lte = max_dec)#, field_of_view__lte = 30)#.prefetch_related('spec_windows').prefetch_related('traces')
    # if the redshift is zero, no need to look into frequency support
    print("size 1:" + str(obs_result.count()))
    if(z == 0):
        obs_result = obs_result.filter(bands__designation__in = bands)
    else:
        z_bands = [] 
        for b in Band.objects.filter(designation__in = bands):
            z_bands.append({
                "start": b.start / (1+z), # cosmological redshift
                "end": b.end / (1+z)
            })
            print(bands)
        for o in obs_result:
            covers = coversBands(z_bands, o)
            if(not covers):
                obs_result = obs_result.exclude(id=o.id)

    print(obs_result.query)

    print("size 2:" + str(obs_result.count()))
# =============================================================================

    JSONplot = get_json_plot(center, size, res, obs_result)

# =============================================================================
#     RETURN A JSON OBJECT
# =============================================================================

    return JsonResponse(JSONplot, safe=False)
