import numpy as np
from field_plot.json_builder import *
from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from django.shortcuts import render
from django.http import JsonResponse
from common.models import Observation, SpectralWindow, Trace, Band, EmissionLine
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q, OuterRef, Exists

ra_origin = 0
dec_origin = 0
inc = 0
minF = 0
maxF = 0

# determines if an observation has coverage on the listed (and possibly redshifted) ranges
def covers_ranges(z_ranges, o):
    for b in z_ranges:
        for w in o.spec_windows.iterator():
            if((w.start < b['start'] and w.end > b['start']) or
                (w.start < b['end'] and w.end > b['end']) or
                (w.start < b['start'] and w.end > b['end']) or
                (w.start > b['start'] and w.end < b['end'])):
                return True
    return False

def get_min_max_f(o):
    min_f = 9999
    max_f = -9999
    for w in o.spec_windows.iterator():
        min_f = min(min_f, w.start, w.end)
        max_f = max(max_f, w.start, w.end)
    return([min_f, max_f])
        


def index(request):
    #return HttpResponse("<h1>Hello world</h1>")
    return render(request, 'field_plot/main.html')

def get_lines(request):

    lines_list = []
    lines_result = EmissionLine.objects.all()
    for l in lines_result:
        lines_list.append({
            "line_id": l.line_id,
            "species": l.species,
            "line": l.line,
            "frequency": l.frequency
        })
    
    lines_json = json.dumps({"lines": lines_list}, cls=DjangoJSONEncoder)

    return JsonResponse(lines_json, safe=False)

# ==========================
# ======= FILTERS ==========
# ==========================
def filter_obs_by_bands(obs, freq_list):
    return(obs.bands.designation in freq_list)
    
# returns the json file generated with the given request
def get_plot(request):

    ra = float(request.GET.get('ra', None))
    dec = float(request.GET.get('dec', None))
    size = float(request.GET.get('size', None))
    frequency_options = request.GET.get('frequency_option', None)
    frequency = request.GET.getlist('frequency[]', None)
    z = request.GET.getlist('redshift[]', None)
    res = float(request.GET.get('res', None))

    z_min = float(z[0])
    z_max = float(z[1])

    # defines the center of the observation in the form of a SkyCoord object
    center = SkyCoord(ra, dec, unit=(u.deg, u.deg))

    min_ra = ra - (size / 2)
    max_ra = ra + (size / 2)
    min_dec = dec - (size / 2)
    max_dec = dec + (size / 2)

    # =============================================================================
    print(str(min_ra) + " , " + str(max_ra) + " , " + str(min_dec) + " , " + str(max_dec))
    
    obs_result = Observation.objects.filter(ra__gte = min_ra, ra__lte = max_ra, dec__gte = min_dec, dec__lte = max_dec, field_of_view__lte = 300)#.prefetch_related('traces')#.prefetch_related('spec_windows')#
    # if the redshift is zero AND we are looking into bands, no need to look into frequency support
    # temporary default
    # print(obs_result.query)
    min_freq = 9999
    max_freq = -9999 
    if(z_max == 0 and frequency_options == 'freq-bands'):
        obs_result = obs_result.filter(bands__designation__in = frequency)
        bands_qs = Band.objects.filter(designation__in = frequency)
        min_freq = bands_qs.first().start
        max_freq = bands_qs.last().end
    # otherwise, run through the remaining use cases
    else:
        # the only common object across the use cases
        z_bands = []
        if(frequency_options == 'freq-bands'):        
            
            for b in Band.objects.filter(designation__in = frequency):
                print(b.start)
                print(z_min)
                f1 = b.start / (1+z_min) # cosmological redshift
                f2 = b.end / (1+z_max)
                new_z_band = {
                    "start": min(f1, f2), 
                    "end": max(f1, f2)
                }
                print(new_z_band)
                #if(new_z_band["start"] < min_freq): min_freq = new_z_band["start"]
                #if(new_z_band["end"] > max_freq): max_freq = new_z_band["end"]
                z_bands.append(new_z_band)
        # frequency range
        elif(frequency_options == 'freq-range'):
            min_f = float(frequency[0]) / (1+z_min)
            max_f = float(frequency[1]) / (1+z_max)
            z_bands.append({"start": min_f, "end": max_f})
        # emission line
        else:
            em_freq = float(frequency[0])
            min_f = em_freq / (1+z_min)
            max_f = em_freq / (1+z_max)
            z_bands.append({"start": min_f, "end": max_f})
            windows = SpectralWindow.objects.filter(
                Q(observation = OuterRef('pk')),
                Q(start__lte = min_f, end__gte = min_f) | Q(start__lte = max_f, end__gte = max_f) | Q(start__gte = min_f, end__lte = max_f)
            )
            obs_result = obs_result.filter(Exists(windows))
        
        print(obs_result.query)
        # filter out the observations that fall outside the defined frequency range(s)
        exclude_ids = []
        for o in obs_result:
                covers = covers_ranges(z_bands, o)
                if(not covers):
                    exclude_ids.append(o.id)
                # update the min and max frequency values across the obs set
                else:
                    min_max = get_min_max_f(o)
                    min_freq = min(min_freq, min_max[0])
                    max_freq = max(max_freq, min_max[1])

        obs_result = obs_result.exclude(id__in = exclude_ids)
        print(obs_result.query)

# =============================================================================

    JSONplot = get_json_plot(center, size, res, obs_result, min_freq, max_freq)

# =============================================================================
#     RETURN A JSON OBJECT
# =============================================================================

    return JsonResponse(JSONplot, safe=False)
