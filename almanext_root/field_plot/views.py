import numpy as np
from field_plot.json_builder import *
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
    return render(request, 'field_plot/main.html')

# Create your views here.
def get_plot(request):

    print('got here!')
    ra = float(request.GET.get('ra', None))
    dec = float(request.GET.get('dec', None))
    size = float(request.GET.get('size', None))
    bands = request.GET.get('bands', None)
    redshift = float(request.GET.get('redshift', None))
    res = float(request.GET.get('res', None))

    # defines the center of the observation in the form of a SkyCoord object
    center = SkyCoord(ra, dec, unit=(u.deg, u.deg))

    min_ra = ra - size
    max_ra = ra + size
    min_dec = dec - size
    max_dec = dec + size

    obs_set = []

    # =============================================================================

    print(str(min_ra) + " , " + str(max_ra) + " , " + str(min_dec) + " , " + str(max_dec))
    # get observations (NEEDS OVERHAUL, CURRENTLY IT ONLY FILTERS BY REGION, NOT FREQUENCY SUPPORT)
    query_result = Observation.objects.filter(ra__gte = min_ra, ra__lte = max_ra, dec__gte = min_dec, dec__lte = max_dec, field_of_view__lte = 30)#.prefetch_related('spec_windows').prefetch_related('traces')

    print("size:" + str(query_result.count()))
# =============================================================================

    JSONplot = get_json_plot(center, size, res, query_result)

# =============================================================================
#     RETURN A JSON OBJECT
# =============================================================================

    return JsonResponse(JSONplot, safe=False)
